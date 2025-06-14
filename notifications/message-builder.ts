import logger from '@/core/logger'
import {NotificationPayload, SlackAttachment, SlackMessage} from '@/types/common'
import {AppStoreFormatter} from './formatters/app-store-formatter'
import {PlayStoreFormatter} from './formatters/play-store-formatter'

export class MessageBuilder {
  private appStoreFormatter: AppStoreFormatter
  private playStoreFormatter: PlayStoreFormatter

  constructor() {
    this.appStoreFormatter = new AppStoreFormatter()
    this.playStoreFormatter = new PlayStoreFormatter()
  }

  async buildMessage(notification: NotificationPayload): Promise<SlackMessage> {
    logger.debug('Building Slack message', {
      platform: notification.platform,
      appName: notification.appName,
      status: notification.status,
    })

    try {
      let message: SlackMessage

      switch (notification.platform) {
        case 'app-store':
          message = await this.appStoreFormatter.formatMessage(notification)
          break
        case 'play-store':
          message = await this.playStoreFormatter.formatMessage(notification)
          break
        default:
          throw new Error(`Unsupported platform: ${notification.platform}`)
      }

      return this.enhanceMessage(message, notification)
    } catch (error) {
      logger.error('Failed to build message', {
        platform: notification.platform,
        error: (error as Error).message,
      })

      return this.buildFallbackMessage(notification)
    }
  }

  private enhanceMessage(message: SlackMessage, notification: NotificationPayload): SlackMessage {
    const timestamp = Math.floor(notification.timestamp.getTime() / 1000)

    if (message.attachments) {
      message.attachments.forEach(attachment => {
        if (!attachment.footer) {
          attachment.footer = `Store Notifier • ${notification.platform
            .replace('-', ' ')
            .toUpperCase()}`
        }
        if (!attachment.ts) {
          attachment.ts = timestamp.toString()
        }
      })
    }

    return message
  }

  private buildFallbackMessage(notification: NotificationPayload): SlackMessage {
    const emoji = this.getStatusEmoji(notification.status, notification.platform)
    return {
      text: `${emoji} ${notification.appName} - ${notification.status}`,
      attachments: [
        {
          color: this.getStatusColor(notification.status),
          text: notification.message,
          footer: `Store Notifier • ${notification.platform.replace('-', ' ').toUpperCase()}`,
          ts: Math.floor(notification.timestamp.getTime() / 1000).toString(),
        },
      ],
    }
  }

  async buildBatchMessage(notifications: NotificationPayload[]): Promise<SlackMessage> {
    if (notifications.length === 0) {
      throw new Error('Cannot build message for empty notifications array')
    }

    if (notifications.length === 1) {
      return this.buildMessage(notifications[0])
    }

    const groupedByPlatform = this.groupNotificationsByPlatform(notifications)
    const attachments: SlackAttachment[] = []

    for (const [platform, platformNotifications] of Object.entries(groupedByPlatform)) {
      const platformAttachment = await this.buildPlatformSummaryAttachment(
        platform as 'app-store' | 'play-store',
        platformNotifications,
      )
      attachments.push(platformAttachment)
    }

    return {
      text: `📱 ${notifications.length} app updates across ${
        Object.keys(groupedByPlatform).length
      } platform(s)`,
      attachments,
    }
  }

  private groupNotificationsByPlatform(
    notifications: NotificationPayload[],
  ): Record<string, NotificationPayload[]> {
    return notifications.reduce(
      (groups, notification) => {
        if (!groups[notification.platform]) {
          groups[notification.platform] = []
        }
        groups[notification.platform].push(notification)
        return groups
      },
      {} as Record<string, NotificationPayload[]>,
    )
  }

  private async buildPlatformSummaryAttachment(
    platform: 'app-store' | 'play-store',
    notifications: NotificationPayload[],
  ): Promise<SlackAttachment> {
    const platformName = platform.replace('-', ' ').toUpperCase()
    const appCount = new Set(notifications.map(n => n.appName)).size

    const fields = notifications.slice(0, 5).map(notification => ({
      title: notification.appName,
      value: notification.message,
      short: false,
    }))

    if (notifications.length > 5) {
      fields.push({
        title: 'Additional Updates',
        value: `... and ${notifications.length - 5} more updates`,
        short: false,
      })
    }

    return {
      color: this.getPlatformColor(platform),
      title: `${platformName} Updates`,
      text: `${notifications.length} update(s) for ${appCount} app(s)`,
      fields,
      footer: `Store Notifier • ${platformName}`,
      ts: Math.floor(Date.now() / 1000).toString(),
    }
  }

  private getStatusColor(status: string): string {
    const lowerStatus = status.toLowerCase()

    if (
      lowerStatus.includes('ready') ||
      lowerStatus.includes('completed') ||
      lowerStatus.includes('approved')
    ) {
      return 'good'
    }
    if (
      lowerStatus.includes('rejected') ||
      lowerStatus.includes('failed') ||
      lowerStatus.includes('invalid')
    ) {
      return 'danger'
    }
    if (
      lowerStatus.includes('review') ||
      lowerStatus.includes('progress') ||
      lowerStatus.includes('processing')
    ) {
      return 'warning'
    }

    return '#439FE0'
  }

  private getPlatformColor(platform: 'app-store' | 'play-store'): string {
    return platform === 'app-store' ? '#007AFF' : '#34A853'
  }

  private getStatusEmoji(status: string, platform: 'app-store' | 'play-store'): string {
    return platform === 'app-store'
      ? status.getAppStoreStatusEmoji()
      : status.getPlayStoreStatusEmoji()
  }
}

export default MessageBuilder
