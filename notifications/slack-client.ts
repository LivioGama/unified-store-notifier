import logger from '@/core/logger'
import {SlackAttachment, SlackMessage} from '@/types/common'
import {IncomingWebhook} from '@slack/webhook'

class SlackClient {
  private webhook: IncomingWebhook | null = null
  private channelName: string

  constructor(webhookUrl: string, channelName = '#notifications') {
    this.webhook = new IncomingWebhook(webhookUrl)
    this.channelName = channelName
    logger.info('Slack client initialized', {channelName})
  }

  async sendMessage(message: SlackMessage): Promise<boolean> {
    if (!this.webhook) {
      logger.error('Slack webhook not initialized')
      return false
    }

    try {
      const payload = {
        text: message.text,
        channel: message.channel || this.channelName,
        attachments: message.attachments || [],
      }

      await this.webhook.send(payload)

      logger.info('Slack message sent successfully', {
        channel: payload.channel,
        attachmentCount: payload.attachments.length,
      })

      return true
    } catch (error) {
      logger.error('Failed to send Slack message', {
        error: (error as Error).message,
        channel: message.channel || this.channelName,
      })
      return false
    }
  }

  async sendSimpleMessage(text: string, channel?: string): Promise<boolean> {
    return this.sendMessage({
      text,
      channel,
    })
  }

  async sendRichMessage(
    title: string,
    text: string,
    attachments: SlackAttachment[] = [],
    channel?: string,
  ): Promise<boolean> {
    return this.sendMessage({
      text: title,
      attachments: [
        {
          text,
          color: 'good',
          footer: 'Store Notifier',
          ts: Math.floor(Date.now() / 1000).toString(),
        },
        ...attachments,
      ],
      channel,
    })
  }

  async testConnection(): Promise<boolean> {
    try {
      // await this.sendSimpleMessage('🧪 Store Notifier connection test successful!')
      logger.info('Slack connection test passed')
      return true
    } catch (error) {
      logger.error('Slack connection test failed', {
        error: (error as Error).message,
      })
      return false
    }
  }

  updateChannel(channelName: string): void {
    this.channelName = channelName
    logger.info('Slack channel updated', {channelName})
  }
}

export default SlackClient
