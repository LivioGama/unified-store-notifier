import {NotificationPayload, SlackMessage} from '@/types/common'

export abstract class BaseFormatter {
  abstract formatMessage(notification: NotificationPayload): Promise<SlackMessage>
}

export default BaseFormatter
