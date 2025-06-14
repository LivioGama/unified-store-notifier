import '@/core/string-utilities'
import {NotificationPayload, SlackMessage} from '@/types/common'
import {BaseFormatter} from './base-formatter'

export class AppStoreFormatter extends BaseFormatter {
  async formatMessage(notification: NotificationPayload): Promise<SlackMessage> {
    const {metadata} = notification
    const isBuildUpdate = metadata?.buildNumber !== undefined

    if (isBuildUpdate) {
      return this.formatBuildMessage(notification)
    } else {
      return this.formatAppMessage(notification)
    }
  }

  private formatAppMessage(notification: NotificationPayload): SlackMessage {
    const appName = notification.appName
    const status = notification.status.formatted()

    const message = `The status of your app *${appName}* has been changed to *${status}*`

    return {
      text: message,
      attachments: [this.buildAppAttachment(notification)],
    }
  }

  private formatBuildMessage(notification: NotificationPayload): SlackMessage {
    const {metadata} = notification
    const appName = notification.appName
    const version = metadata?.version as string
    const status = notification.status

    const message = `The status of build version *${version}* for your app *${appName}* has been changed to *${status}*`

    return {
      text: message,
      attachments: [this.buildBuildAttachment(notification)],
    }
  }

  private buildAppAttachment(notification: NotificationPayload) {
    const {metadata} = notification
    const appName = notification.appName
    const status = notification.status
    const version = metadata?.version as string
    const iconUrl = metadata?.iconUrl as string
    const bundleId = metadata?.bundleId as string

    return {
      fallback: `The status of your app ${appName} has been changed to ${status.formatted()}`,
      color: this.colorForStatus(status),
      title: 'App Store Connect',
      author_name: appName,
      author_icon: iconUrl,
      title_link: `https://appstoreconnect.apple.com/apps/${bundleId}/appstore`,
      fields: [
        {
          title: 'Version',
          value: version,
          short: true,
        },
        {
          title: 'Status',
          value: status.formatted(),
          short: true,
        },
      ],
      footer: 'App Store Connect',
      footer_icon:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Mac_App_Store_logo.png/500px-Mac_App_Store_logo.png',
      ts: (new Date().getTime() / 1000).toString(),
    }
  }

  private buildBuildAttachment(notification: NotificationPayload) {
    const {metadata} = notification
    const appName = notification.appName
    const buildVersion = metadata?.version as string
    const buildStatus = notification.status
    const appVersion = metadata?.appVersion as string
    const appStatus = metadata?.appStatus as string
    const iconUrl = metadata?.iconUrl as string
    const bundleId = metadata?.bundleId as string

    const fallback = `The status of build version ${buildVersion} for your app ${appName} has been changed to ${buildStatus}`

    return {
      fallback,
      color: this.colorForStatus(buildStatus),
      title: 'App Store Connect',
      author_name: appName,
      author_icon: iconUrl,
      title_link: `https://appstoreconnect.apple.com/apps/${bundleId}/appstore`,
      fields: [
        {
          title: 'Build Version',
          value: buildVersion,
          short: true,
        },
        {
          title: 'Build Status',
          value: buildStatus,
          short: true,
        },
        {
          title: 'Version',
          value: appVersion,
          short: true,
        },
        {
          title: 'App Status',
          value: appStatus?.formatted() || 'N/A',
          short: true,
        },
      ],
      footer: 'App Store Connect',
      footer_icon:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Mac_App_Store_logo.png/500px-Mac_App_Store_logo.png',
      ts: (new Date().getTime() / 1000).toString(),
    }
  }

  private colorForStatus(status: string): string {
    const infoColor = '#8e8e8e'
    const warningColor = '#f4f124'
    const successColor1 = '#1eb6fc'
    const successColor2 = '#14ba40'
    const failureColor = '#e0143d'

    const colorMapping: Record<string, string> = {
      // App
      PREPARE_FOR_SUBMISSION: infoColor,
      WAITING_FOR_REVIEW: successColor1,
      IN_REVIEW: successColor1,
      PENDING_CONTRACT: warningColor,
      WAITING_FOR_EXPORT_COMPLIANCE: warningColor,
      PENDING_DEVELOPER_RELEASE: successColor2,
      PROCESSING_FOR_APP_STORE: successColor2,
      PENDING_APPLE_RELEASE: successColor2,
      READY_FOR_SALE: successColor2,
      REJECTED: failureColor,
      METADATA_REJECTED: failureColor,
      REMOVED_FROM_SALE: failureColor,
      DEVELOPER_REJECTED: failureColor,
      DEVELOPER_REMOVED_FROM_SALE: failureColor,
      INVALID_BINARY: failureColor,

      // Build
      PROCESSING: infoColor,
      FAILED: failureColor,
      INVALID: failureColor,
      VALID: successColor2,
    }

    return colorMapping[status] || infoColor
  }
}

export default AppStoreFormatter
