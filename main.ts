#!/usr/bin/env node

import environmentConfig from '@/config/environment'
import logger from '@/core/logger'
import UnifiedPoller from '@/core/poller'
import {LogLevel} from '@/types/common'

class StoreNotifierApp {
  private poller: UnifiedPoller
  private isShuttingDown = false

  constructor() {
    this.poller = new UnifiedPoller()
    this.setupSignalHandlers()
    this.setupErrorHandlers()
  }

  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Unified Store Notifier')

      this.logStartupInfo()

      if (!environmentConfig.validateConfig()) {
        throw new Error('Configuration validation failed')
      }

      await this.poller.start()

      logger.info('✅ Unified Store Notifier started successfully')

      this.logOperationalInfo()
    } catch (error) {
      logger.error('Failed to start application', {
        error: (error as Error).message,
      })
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    logger.info('🛑 Shutting down Unified Store Notifier')

    try {
      await this.poller.stop()
      logger.info('✅ Shutdown completed successfully')
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown', {
        error: (error as Error).message,
      })
      process.exit(1)
    }
  }

  private setupSignalHandlers(): void {
    const handleShutdown = (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown`)
      this.stop().catch(error => {
        logger.error('Error during signal shutdown', {
          signal,
          error: error.message,
        })
        process.exit(1)
      })
    }

    process.on('SIGTERM', () => handleShutdown('SIGTERM'))
    process.on('SIGINT', () => handleShutdown('SIGINT'))

    process.on('SIGUSR2', () => {
      logger.info('Received SIGUSR2, performing health check')
      this.performHealthCheck()
    })
  }

  private setupErrorHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      })
      this.stop()
    })

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled promise rejection', {
        reason: String(reason),
      })
      this.stop()
    })
  }

  private logStartupInfo(): void {
    const enabledPlatforms = environmentConfig.detectEnabledPlatforms()
    const config = environmentConfig.getUnifiedConfig()

    logger.info('Configuration detected', {
      appStore: enabledPlatforms.appStore,
      playStore: enabledPlatforms.playStore,
      pollInterval: config.polling.defaultInterval,
      slackChannel: config.slack.channelName,
    })

    if (enabledPlatforms.appStore) {
      const appStoreConfig = environmentConfig.getAppStoreConfig()
      logger.info('App Store configuration', {
        bundleCount: appStoreConfig.appIdentifiers.length,
        numberOfBuilds: appStoreConfig.numberOfBuilds,
        authMethod: appStoreConfig.credentials.apiKey ? 'API Key' : 'Username/Password',
      })
    }

    if (enabledPlatforms.playStore) {
      const playStoreConfig = environmentConfig.getPlayStoreConfig()
      logger.info('Play Store configuration', {
        packageCount: playStoreConfig.appIdentifiers.length,
      })
    }
  }

  private logOperationalInfo(): void {
    const status = this.poller.getStatus()

    logger.info('Operational status', {
      platforms: status.enabledPlatforms,
      pollInterval: status.pollInterval,
      nextPolls: Object.entries(status.nextPollTimes).map(([platform, time]) => ({
        platform,
        nextPoll: time.toISOString(),
      })),
    })
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.poller.healthCheck()
      logger.info('Health check results', health)
    } catch (error) {
      logger.error('Health check failed', {
        error: (error as Error).message,
      })
    }
  }
}

const parseCommandLineArgs = (): void => {
  const args = process.argv.slice(2)

  if (args.includes('--debug')) {
    logger.setLevel(LogLevel.DEBUG)
    logger.debug('Debug logging enabled')
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Unified Store Notifier

USAGE:
  npm start [OPTIONS]

OPTIONS:
  --debug     Enable debug logging
  --help, -h  Show this help message

ENVIRONMENT VARIABLES:
  SLACK_WEBHOOK_URL              Slack webhook URL (required)
  SLACK_CHANNEL_NAME             Slack channel name (optional, default: #notifications)
  
  App Store Connect:
  SPACESHIP_CONNECT_API_KEY      App Store Connect API private key
  SPACESHIP_CONNECT_API_KEY_ID   App Store Connect API key ID  
  SPACESHIP_CONNECT_API_ISSUER_ID App Store Connect API issuer ID
  ITC_USERNAME                   iTunes Connect username (fallback)
  ITC_PASSWORD                   iTunes Connect password (fallback)
  BUNDLE_IDENTIFIERS             Comma-separated bundle IDs to monitor
  NUMBER_OF_BUILDS               Number of builds to check per app (default: 2)
  
  Google Play Console:
  GOOGLE_PLAY_JSON_KEY_DATA      Service account JSON key data
  GOOGLE_PLAY_PACKAGE_NAMES      Comma-separated package names to monitor
  
  General:
  POLL_TIME_IN_SECONDS           Polling interval in seconds (default: 90)

EXAMPLES:
  npm start                      Start with default configuration
  npm start -- --debug          Start with debug logging
  
For more information, visit: https://github.com/rogerluan/unified-store-notifier
`)
    process.exit(0)
  }
}

const main = async (): Promise<void> => {
  parseCommandLineArgs()

  const app = new StoreNotifierApp()
  await app.start()
}

if (require.main === module) {
  main().catch(error => {
    console.error('Failed to start application:', error.message)
    process.exit(1)
  })
}

export default StoreNotifierApp
