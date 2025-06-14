import '@/core/string-utilities'
import {NotificationPayload, SlackMessage} from '@/types/common'
import {BaseFormatter} from './base-formatter'

export class PlayStoreFormatter extends BaseFormatter {
  async formatMessage(notification: NotificationPayload): Promise<SlackMessage> {
    const {metadata} = notification
    const packageName = notification.appName
    const currentVersionCode = metadata?.versionCode as number
    const lastVersionCode = metadata?.previousVersionCode as number
    const emoji = notification.status.getPlayStoreStatusEmoji()

    const lastTrackInfo = metadata?.lastTrackInfo as any

    let message: string
    if (!lastTrackInfo || lastTrackInfo.status === 'EMPTY') {
      message = `${emoji} New release detected for *${packageName}* with version code *${currentVersionCode}*`
    } else if (currentVersionCode !== lastVersionCode) {
      message = `${emoji} Version code updated for *${packageName}*: *${lastVersionCode}* → *${currentVersionCode}*`
    } else {
      const status = notification.status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
      message = `${emoji} The status of your app *${packageName}* has been changed to *${status}*`
    }

    return {
      text: message,
      attachments: [this.buildPlayConsoleAttachment(notification)],
    }
  }

  private buildPlayConsoleAttachment(notification: NotificationPayload) {
    const {metadata} = notification
    const packageName = notification.appName
    const track = (metadata?.track as string) || 'production'
    const currentVersionCode = metadata?.versionCode as number
    const status = notification.status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())

    return {
      fallback: `Google Play Console update for ${packageName} on ${track} track`,
      color: this.colorForStatus(notification.status),
      title: 'Google Play Console',
      author_name: packageName,
      author_icon:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_Play_2022_icon.svg/1200px-Google_Play_2022_icon.svg.png',
      title_link: `https://play.google.com/console/developers/app/${packageName}/tracks/${track}`,
      fields: [
        {
          title: 'Version Code',
          value: currentVersionCode?.toString() || 'N/A',
          short: true,
        },
        {
          title: 'Status',
          value: status,
          short: true,
        },
      ],
      footer: 'Google Play Console',
      footer_icon:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_Play_2022_icon.svg/1200px-Google_Play_2022_icon.svg.png',
      ts: (new Date().getTime() / 1000).toString(),
    }
  }

  private colorForStatus(status: string): string {
    const colorMapping: Record<string, string> = {
      draft: '#8e8e8e',
      inProgress: '#1eb6fc',
      halted: '#e0143d',
      completed: '#14ba40',
      statusUnspecified: '#8e8e8e',
    }
    return colorMapping[status] || '#8e8e8e'
  }
}

export default PlayStoreFormatter
