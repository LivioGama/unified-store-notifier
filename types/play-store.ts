export interface GooglePlayAuthConfig {
  jsonKeyPath?: string
  jsonKeyData?: string
}

export interface GooglePlayConsoleOptions {
  packageNames?: string
}

export interface TrackInfo {
  track: string
  versionCodes: number[]
  latestVersionCode: number | null
  status: string
}

export interface AppTrackInfo {
  packageName: string
  tracks: {
    internal: TrackInfo
    alpha: TrackInfo
    beta: TrackInfo
    production: TrackInfo
  }
}

export enum TrackStatus {
  DRAFT = 'draft',
  HALTED = 'halted',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  ROLLED_BACK = 'rolledBack',
}

export enum ReleaseStatus {
  STATUS_UNSPECIFIED = 'statusUnspecified',
  DRAFT = 'draft',
  IN_PROGRESS = 'inProgress',
  HALTED = 'halted',
  COMPLETED = 'completed',
}

export interface PlayStoreApp {
  packageName: string
  defaultLanguage?: string
  title?: string
  shortDescription?: string
  fullDescription?: string
  contactEmail?: string
  contactPhone?: string
  contactWebsite?: string
}

export interface PlayStoreTrack {
  track: string
  status: TrackStatus
  userFraction?: number
  releases: PlayStoreRelease[]
}

export interface PlayStoreRelease {
  name?: string
  versionCodes: number[]
  status: ReleaseStatus
  userFraction?: number
  releaseNotes?: LocalizedText[]
  countryTargeting?: CountryTargeting
  inAppUpdatePriority?: number
}

export interface LocalizedText {
  language: string
  text: string
}

export interface CountryTargeting {
  countries?: string[]
  includeRestOfWorld?: boolean
}

export interface PlayStoreVersion {
  versionCode: number
  versionName?: string
  status: string
  userFraction?: number
  track: string
  releaseNotes?: LocalizedText[]
  lastModifiedTime?: Date
  createdTime?: Date
}

export interface PlayStoreResponse {
  apps: Array<{
    app: PlayStoreApp
    tracks: PlayStoreTrack[]
    versions: PlayStoreVersion[]
  }>
  timestamp: Date
  fetchDuration: number
}

export interface PlayStoreNotificationData {
  app: PlayStoreApp
  version: PlayStoreVersion
  track: PlayStoreTrack
  previousStatus?: ReleaseStatus
  statusChange: boolean
  isNewVersion: boolean
  versionComparison?: {
    versionCodeChanged: boolean
    versionNameChanged: boolean
    statusChanged: boolean
    trackChanged: boolean
  }
}

export interface ServiceAccountAuth {
  type: string
  project_id?: string
  private_key_id?: string
  private_key?: string
  client_email?: string
  client_id?: string
  auth_uri?: string
  token_uri?: string
  auth_provider_x509_cert_url?: string
  client_x509_cert_url?: string
}

export interface PlayStoreAuthMethod {
  type: 'service_account'
  isValid: boolean
  details: {
    hasValidJson?: boolean
    hasRequiredFields?: boolean
    emailValid?: boolean
    privateKeyValid?: boolean
  }
}

export interface TrackUpdateInfo {
  packageName: string
  track: string
  previousVersionCodes: number[]
  currentVersionCodes: number[]
  addedVersions: number[]
  removedVersions: number[]
  statusChanged: boolean
  userFractionChanged: boolean
}
