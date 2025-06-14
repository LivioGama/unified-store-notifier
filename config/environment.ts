import logger from '@/core/logger'
import {AppStoreAuthMethod} from '@/types/app-store'
import {UnifiedConfig} from '@/types/common'
import {PlayStoreAuthMethod, ServiceAccountAuth} from '@/types/play-store'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const SLACK_CHANNEL_NAME = process.env.SLACK_CHANNEL_NAME
const POLL_TIME_IN_SECONDS = process.env.POLL_TIME_IN_SECONDS

const SPACESHIP_CONNECT_API_KEY = process.env.SPACESHIP_CONNECT_API_KEY
const SPACESHIP_CONNECT_API_KEY_ID = process.env.SPACESHIP_CONNECT_API_KEY_ID
const SPACESHIP_CONNECT_API_ISSUER_ID = process.env.SPACESHIP_CONNECT_API_ISSUER_ID
const ITC_USERNAME = process.env.ITC_USERNAME
const ITC_PASSWORD = process.env.ITC_PASSWORD
const ITC_TEAM_IDS = process.env.ITC_TEAM_IDS
const BUNDLE_IDENTIFIERS = process.env.BUNDLE_IDENTIFIERS
const NUMBER_OF_BUILDS = process.env.NUMBER_OF_BUILDS

const GOOGLE_PLAY_JSON_KEY_DATA = process.env.GOOGLE_PLAY_JSON_KEY_DATA
const GOOGLE_PLAY_PACKAGE_NAMES = process.env.GOOGLE_PLAY_PACKAGE_NAMES

class EnvironmentConfig {
  private validateRequired(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`)
    }
    return value
  }

  private getOptional(value: string | undefined, defaultValue?: string): string | undefined {
    return value || defaultValue
  }

  detectEnabledPlatforms(): {appStore: boolean; playStore: boolean} {
    const hasAppStoreCredentials = !!(SPACESHIP_CONNECT_API_KEY || ITC_USERNAME)
    const hasPlayStoreCredentials = !!(GOOGLE_PLAY_JSON_KEY_DATA && GOOGLE_PLAY_PACKAGE_NAMES)

    return {
      appStore: hasAppStoreCredentials,
      playStore: hasPlayStoreCredentials,
    }
  }

  getSlackConfig() {
    const webhookUrl = this.validateRequired(SLACK_WEBHOOK_URL, 'SLACK_WEBHOOK_URL')
    const channelName = this.getOptional(SLACK_CHANNEL_NAME, '#notifications')

    return {
      webhookUrl,
      channelName,
    }
  }

  getAppStoreConfig() {
    return {
      enabled: this.detectEnabledPlatforms().appStore,
      pollInterval: parseInt(this.getOptional(POLL_TIME_IN_SECONDS, '90') || '90'),
      credentials: {
        apiKey: this.getOptional(SPACESHIP_CONNECT_API_KEY) || '',
        apiKeyId: this.getOptional(SPACESHIP_CONNECT_API_KEY_ID) || '',
        issuerId: this.getOptional(SPACESHIP_CONNECT_API_ISSUER_ID) || '',
        username: this.getOptional(ITC_USERNAME) || '',
        password: this.getOptional(ITC_PASSWORD) || '',
        teamIds: this.getOptional(ITC_TEAM_IDS) || '',
      },
      appIdentifiers: BUNDLE_IDENTIFIERS ? BUNDLE_IDENTIFIERS.split(',').map(id => id.trim()) : [],
      numberOfBuilds: parseInt(this.getOptional(NUMBER_OF_BUILDS, '2') || '2'),
    }
  }

  getPlayStoreConfig() {
    let jsonKeyData = ''
    if (GOOGLE_PLAY_JSON_KEY_DATA) {
      try {
        jsonKeyData = Buffer.from(GOOGLE_PLAY_JSON_KEY_DATA, 'base64').toString()
      } catch (error) {
        logger.error('Failed to decode base64 GOOGLE_PLAY_JSON_KEY_DATA', {
          error: (error as Error).message,
        })
      }
    }

    return {
      enabled: this.detectEnabledPlatforms().playStore,
      pollInterval: parseInt(this.getOptional(POLL_TIME_IN_SECONDS, '90') || '90'),
      credentials: {
        jsonKeyData,
      },
      appIdentifiers: GOOGLE_PLAY_PACKAGE_NAMES
        ? GOOGLE_PLAY_PACKAGE_NAMES.split(',').map(name => name.trim())
        : [],
    }
  }

  getUnifiedConfig(): UnifiedConfig {
    const enabledPlatforms = this.detectEnabledPlatforms()

    if (!enabledPlatforms.appStore && !enabledPlatforms.playStore) {
      throw new Error('No platform credentials found. Please configure at least one platform.')
    }

    const config: UnifiedConfig = {
      slack: this.getSlackConfig(),
      platforms: {},
      polling: {
        defaultInterval: parseInt(this.getOptional(POLL_TIME_IN_SECONDS, '90') || '90'),
        maxRetries: 3,
      },
    }

    if (enabledPlatforms.appStore) {
      config.platforms.appStore = this.getAppStoreConfig()
    }

    if (enabledPlatforms.playStore) {
      config.platforms.playStore = this.getPlayStoreConfig()
    }

    return config
  }

  // App Store validation methods
  validateAppStoreCredentials(): AppStoreAuthMethod {
    const appStoreConfig = this.getAppStoreConfig()

    const hasApiKeyAuth = !!(
      appStoreConfig.credentials.apiKey &&
      appStoreConfig.credentials.apiKeyId &&
      appStoreConfig.credentials.issuerId
    )

    const hasUsernameAuth = !!(
      appStoreConfig.credentials.username && appStoreConfig.credentials.password
    )

    if (hasApiKeyAuth) {
      return {
        type: 'api_key',
        isValid: true,
        details: {
          apiKey: !!appStoreConfig.credentials.apiKey,
          apiKeyId: !!appStoreConfig.credentials.apiKeyId,
          issuerId: !!appStoreConfig.credentials.issuerId,
          teamIds: !!appStoreConfig.credentials.teamIds,
        },
      }
    }

    if (hasUsernameAuth) {
      return {
        type: 'username_password',
        isValid: true,
        details: {
          username: !!appStoreConfig.credentials.username,
          password: !!appStoreConfig.credentials.password,
          teamIds: !!appStoreConfig.credentials.teamIds,
        },
      }
    }

    return {
      type: 'api_key',
      isValid: false,
      details: {
        apiKey: !!appStoreConfig.credentials.apiKey,
        apiKeyId: !!appStoreConfig.credentials.apiKeyId,
        issuerId: !!appStoreConfig.credentials.issuerId,
        username: !!appStoreConfig.credentials.username,
        password: !!appStoreConfig.credentials.password,
        teamIds: !!appStoreConfig.credentials.teamIds,
      },
    }
  }

  // Play Store validation methods
  validatePlayStoreCredentials(): PlayStoreAuthMethod {
    const playStoreConfig = this.getPlayStoreConfig()

    if (!playStoreConfig.credentials.jsonKeyData) {
      return {
        type: 'service_account',
        isValid: false,
        details: {
          hasValidJson: false,
          hasRequiredFields: false,
          emailValid: false,
          privateKeyValid: false,
        },
      }
    }

    try {
      const serviceAccount: ServiceAccountAuth = JSON.parse(playStoreConfig.credentials.jsonKeyData)

      const hasRequiredFields = !!(
        serviceAccount.type === 'service_account' &&
        serviceAccount.client_email &&
        serviceAccount.private_key &&
        serviceAccount.private_key_id
      )

      const emailValid = serviceAccount.client_email?.includes('@') || false
      const privateKeyValid = serviceAccount.private_key?.includes('BEGIN PRIVATE KEY') || false

      return {
        type: 'service_account',
        isValid: hasRequiredFields && emailValid && privateKeyValid,
        details: {
          hasValidJson: true,
          hasRequiredFields,
          emailValid,
          privateKeyValid,
        },
      }
    } catch (error) {
      logger.error('Invalid JSON in service account credentials', {
        error: (error as Error).message,
      })
      return {
        type: 'service_account',
        isValid: false,
        details: {
          hasValidJson: false,
          hasRequiredFields: false,
          emailValid: false,
          privateKeyValid: false,
        },
      }
    }
  }

  getPlayStoreServiceAccountData(): ServiceAccountAuth | null {
    const playStoreConfig = this.getPlayStoreConfig()
    try {
      return JSON.parse(playStoreConfig.credentials.jsonKeyData)
    } catch (error) {
      logger.error('Failed to parse service account JSON', {
        error: (error as Error).message,
      })
      return null
    }
  }

  validatePackageName(packageName: string): boolean {
    const packageNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/
    return packageNameRegex.test(packageName)
  }

  validateAllPackageNames(): boolean {
    const playStoreConfig = this.getPlayStoreConfig()
    return playStoreConfig.appIdentifiers.every(packageName =>
      this.validatePackageName(packageName),
    )
  }

  validateConfig(): boolean {
    try {
      const config = this.getUnifiedConfig()

      if (!config.slack.webhookUrl) {
        logger.error('Slack webhook URL is required')
        return false
      }

      if (config.platforms.appStore?.enabled) {
        const authMethod = this.validateAppStoreCredentials()
        if (!authMethod.isValid) {
          logger.error('App Store authentication credentials are invalid')
          return false
        }

        if (config.platforms.appStore.appIdentifiers.length === 0) {
          logger.error('BUNDLE_IDENTIFIERS is required for App Store monitoring')
          return false
        }
      }

      if (config.platforms.playStore?.enabled) {
        const authMethod = this.validatePlayStoreCredentials()
        if (!authMethod.isValid) {
          logger.error('Play Store service account credentials are invalid')
          return false
        }

        if (config.platforms.playStore.appIdentifiers.length === 0) {
          logger.error('GOOGLE_PLAY_PACKAGE_NAMES is required for Play Store monitoring')
          return false
        }

        if (!this.validateAllPackageNames()) {
          logger.error('Invalid package names detected')
          return false
        }
      }

      logger.info('Configuration validation passed', {
        platforms: Object.keys(config.platforms),
      })

      return true
    } catch (error) {
      logger.error('Configuration validation failed', {
        error: (error as Error).message,
      })
      return false
    }
  }
}

export const environmentConfig = new EnvironmentConfig()
export default environmentConfig
