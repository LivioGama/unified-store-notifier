import environmentConfig from '@/config/environment'
import MessageBuilder from '@/notifications/message-builder'
import SlackClient from '@/notifications/slack-client'
import {AppStoreProcessor} from '@/platforms/app-store/processor'
import {PlayStoreProcessor} from '@/platforms/play-store/processor'
import {NotificationPayload, PlatformProcessor} from '@/types/common'
import database from './database'
import logger from './logger'

export class UnifiedPoller {
  private processors: Map<string, PlatformProcessor> = new Map()
  private slackClient: SlackClient | null = null
  private messageBuilder: MessageBuilder
  private isRunning = false
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map()
  private defaultPollInterval = 90000

  constructor() {
    this.messageBuilder = new MessageBuilder()
    this.initializePlatforms()
  }

  private initializePlatforms(): void {
    const config = environmentConfig.getUnifiedConfig()

    if (config.platforms.appStore?.enabled) {
      const appStoreConfig = config.platforms.appStore
      const appStoreProcessor = new AppStoreProcessor()
      this.processors.set('app-store', appStoreProcessor)
      logger.info('App Store processor initialized', {
        bundleCount: appStoreConfig.appIdentifiers.length,
      })
    }

    if (config.platforms.playStore?.enabled) {
      const playStoreConfig = config.platforms.playStore
      const playStoreProcessor = new PlayStoreProcessor()
      this.processors.set('play-store', playStoreProcessor)
      logger.info('Play Store processor initialized', {
        packageCount: playStoreConfig.appIdentifiers.length,
      })
    }

    this.slackClient = new SlackClient(config.slack.webhookUrl, config.slack.channelName)

    this.defaultPollInterval = config.polling.defaultInterval * 1000

    logger.info('Unified poller initialized', {
      enabledPlatforms: Array.from(this.processors.keys()),
      pollInterval: this.defaultPollInterval / 1000,
    })
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Poller is already running')
      return
    }

    logger.info('Starting unified poller')

    if (!(await this.validateConfiguration())) {
      throw new Error('Configuration validation failed')
    }

    if (!(await this.testSlackConnection())) {
      throw new Error('Slack connection test failed')
    }

    this.isRunning = true

    for (const [platform, processor] of this.processors) {
      const interval = setInterval(() => {
        this.pollPlatform(platform, processor).catch(error => {
          logger.error('Platform polling error', {
            platform,
            error: error.message,
          })
        })
      }, this.defaultPollInterval)

      this.pollIntervals.set(platform, interval)

      logger.info('Started polling for platform', {
        platform,
        interval: this.defaultPollInterval / 1000,
      })

      setTimeout(() => {
        this.pollPlatform(platform, processor).catch(error => {
          logger.error('Initial platform polling error', {
            platform,
            error: error.message,
          })
        })
      }, 1000)
    }

    logger.info('Unified poller started successfully')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Poller is not running')
      return
    }

    logger.info('Stopping unified poller')
    this.isRunning = false

    for (const [platform, interval] of this.pollIntervals) {
      clearInterval(interval)
      logger.info('Stopped polling for platform', {platform})
    }

    this.pollIntervals.clear()
    logger.info('Unified poller stopped successfully')
  }

  private async pollPlatform(platform: string, processor: PlatformProcessor): Promise<void> {
    const startTime = Date.now()

    try {
      logger.debug('Starting platform poll', {platform})

      const data = await processor.fetchData()
      const notifications = await processor.processData(data)

      if (notifications.length > 0) {
        await this.sendNotifications(notifications)
        logger.info('Platform poll completed with notifications', {
          platform,
          notificationCount: notifications.length,
          duration: Date.now() - startTime,
        })
      } else {
        logger.debug('Platform poll completed with no notifications', {
          platform,
          duration: Date.now() - startTime,
        })
      }
    } catch (error) {
      logger.error('Platform poll failed', {
        platform,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      })
    }
  }

  private async sendNotifications(notifications: NotificationPayload[]): Promise<void> {
    if (!this.slackClient) {
      logger.error('Slack client not initialized')
      return
    }

    try {
      if (notifications.length === 1) {
        const message = await this.messageBuilder.buildMessage(notifications[0])
        await this.slackClient.sendMessage(message)
      } else {
        const batchMessage = await this.messageBuilder.buildBatchMessage(notifications)
        await this.slackClient.sendMessage(batchMessage)
      }
    } catch (error) {
      logger.error('Failed to send notifications', {
        error: (error as Error).message,
        notificationCount: notifications.length,
      })
    }
  }

  private async validateConfiguration(): Promise<boolean> {
    logger.info('Validating configuration')

    if (this.processors.size === 0) {
      logger.error('No platforms configured')
      return false
    }

    for (const [platform, processor] of this.processors) {
      if (!processor.validateConfig()) {
        logger.error('Platform configuration validation failed', {platform})
        return false
      }
    }

    return environmentConfig.validateConfig()
  }

  private async testSlackConnection(): Promise<boolean> {
    if (!this.slackClient) {
      logger.error('Slack client not initialized')
      return false
    }

    logger.info('Testing Slack connection')
    return this.slackClient.testConnection()
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    platforms: Record<string, boolean>
    database: boolean
    slack: boolean
    uptime: number
  }> {
    const startTime = process.uptime()

    const platformHealth: Record<string, boolean> = {}
    for (const [platform, processor] of this.processors) {
      try {
        platformHealth[platform] = await processor.healthCheck()
      } catch (error) {
        logger.error('Platform health check failed', {
          platform,
          error: (error as Error).message,
        })
        platformHealth[platform] = false
      }
    }

    const databaseHealth = database.isReady()
    const slackHealth = this.slackClient ? await this.slackClient.testConnection() : false

    const allHealthy =
      Object.values(platformHealth).every(healthy => healthy) && databaseHealth && slackHealth

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      platforms: platformHealth,
      database: databaseHealth,
      slack: slackHealth,
      uptime: process.uptime() - startTime,
    }
  }

  getStatus(): {
    isRunning: boolean
    enabledPlatforms: string[]
    pollInterval: number
    nextPollTimes: Record<string, Date>
  } {
    const nextPollTimes: Record<string, Date> = {}

    for (const platform of this.processors.keys()) {
      nextPollTimes[platform] = new Date(Date.now() + this.defaultPollInterval)
    }

    return {
      isRunning: this.isRunning,
      enabledPlatforms: Array.from(this.processors.keys()),
      pollInterval: this.defaultPollInterval / 1000,
      nextPollTimes,
    }
  }
}

export default UnifiedPoller
