export interface AppStoreAuthConfig {
  issuerId?: string
  privateKeyId?: string
  privateKey?: string
  username?: string
  password?: string
}

export interface BuildInfo {
  version: string
  uploaded_date: string
  status: string
}

export interface AppVersionInfo {
  name: string
  version: string
  status: string
  appId: string
  iconUrl: string | null
  builds: BuildInfo[]
}

export interface AppStoreConnectOptions {
  bundleIdentifiers?: string
  numberOfBuilds?: number
  teamIds?: string[]
}

export enum BuildStatus {
  PROCESSING = 'PROCESSING',
  WAITING_FOR_REVIEW = 'WAITING_FOR_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  PENDING_DEVELOPER_RELEASE = 'PENDING_DEVELOPER_RELEASE',
  READY_FOR_SALE = 'READY_FOR_SALE',
  REJECTED = 'REJECTED',
  INVALID_BINARY = 'INVALID_BINARY',
  METADATA_REJECTED = 'METADATA_REJECTED',
  DEVELOPER_REJECTED = 'DEVELOPER_REJECTED',
}

export interface AppStoreApp {
  name: string
  bundleId: string
  adamId?: string
  sku?: string
}

export interface AppStoreBuild {
  version: string
  buildNumber: string
  status: BuildStatus
  uploadDate: Date
  processingStarted?: Date
  reviewStarted?: Date
  releaseDate?: Date
  minOsVersion?: string
  iconUrl?: string
  buildDetails?: BuildDetails
}

export interface BuildDetails {
  fileSize?: number
  expirationDate?: Date
  usesNonExemptEncryption?: boolean
  exportComplianceStatus?: string
  testFlight?: {
    betaAppReviewInfo?: BetaAppReviewInfo
    localizationInfo?: LocalizationInfo[]
    isActive?: boolean
  }
}

export interface BetaAppReviewInfo {
  contactEmail?: string
  contactFirstName?: string
  contactLastName?: string
  contactPhone?: string
  demoAccountName?: string
  demoAccountPassword?: string
  notes?: string
}

export interface LocalizationInfo {
  locale: string
  feedbackEmail?: string
  marketingUrl?: string
  privacyPolicyUrl?: string
  tvOsPrivacyPolicy?: string
  description?: string
  whatsNew?: string
}

export interface AppStoreResponse {
  apps: Array<{
    app: AppStoreApp
    builds: AppStoreBuild[]
    editVersionState?: EditVersionState
    liveVersionState?: LiveVersionState
  }>
  timestamp: Date
  fetchDuration: number
}

export interface EditVersionState {
  versionString: string
  status: string
  createdDate?: Date
  lastModifiedDate?: Date
  reviewSubmissionDate?: Date
  expectedReleaseDate?: Date
}

export interface LiveVersionState {
  versionString: string
  status: string
  releaseDate?: Date
  downloadable?: boolean
}

export interface AppStoreAuthMethod {
  type: 'api_key' | 'username_password'
  isValid: boolean
  details: {
    apiKey?: boolean
    apiKeyId?: boolean
    issuerId?: boolean
    username?: boolean
    password?: boolean
    teamIds?: boolean
  }
}

export interface AppStoreNotificationData {
  app: AppStoreApp
  build: AppStoreBuild
  previousStatus?: BuildStatus
  statusChange: boolean
  isNewBuild: boolean
  buildComparison?: {
    versionChanged: boolean
    buildNumberChanged: boolean
    statusChanged: boolean
  }
}
