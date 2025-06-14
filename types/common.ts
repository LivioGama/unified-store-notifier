export interface NotificationPayload {
  platform: 'app-store' | 'play-store'
  appName: string
  status: string
  message: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface DatabaseEntry {
  key: string
  value: unknown
  platform: 'app-store' | 'play-store'
  timestamp: Date
}

export interface PlatformConfig {
  enabled: boolean
  pollInterval: number
  credentials: Record<string, string>
  appIdentifiers: string[]
}

export interface UnifiedConfig {
  slack: {
    webhookUrl: string
    channelName?: string | undefined
  }
  platforms: {
    appStore?: PlatformConfig
    playStore?: PlatformConfig
  }
  polling: {
    defaultInterval: number
    maxRetries: number
  }
}

export interface LogContext {
  platform?: string
  appId?: string
  operation?: string
  [key: string]: unknown
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface PlatformProcessor {
  name: string
  fetchData(): Promise<unknown>
  processData(data: unknown): Promise<NotificationPayload[]>
  validateConfig(): boolean
  healthCheck(): Promise<boolean>
}

export interface SlackMessage {
  text: string
  attachments?: SlackAttachment[]
  channel?: string | undefined
}

export interface SlackAttachment {
  color?: string
  title?: string
  title_link?: string | undefined
  text?: string
  fields?: SlackField[]
  footer?: string
  ts?: string
}

export interface SlackField {
  title: string
  value: string
  short?: boolean
}
