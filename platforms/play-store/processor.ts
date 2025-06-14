import environmentConfig from '@/config/environment'
import database from '@/core/database'
import {GooglePlayConsoleService} from '@/core/google-play-console'
import logger from '@/core/logger'
import '@/core/string-utilities'
import {NotificationPayload, PlatformProcessor} from '@/types/common'
import {PlayStoreNotificationData, PlayStoreResponse} from '@/types/play-store'

export class PlayStoreProcessor implements PlatformProcessor {
  name = 'play-store'

  validateConfig(): boolean {
    const authMethod = environmentConfig.validatePlayStoreCredentials()
    const config = environmentConfig.getPlayStoreConfig()
    return (
      authMethod.isValid &&
      config.appIdentifiers.length > 0 &&
      environmentConfig.validateAllPackageNames()
    )
  }

  async fetchData(): Promise<PlayStoreResponse> {
    const startTime = Date.now()
    logger.info('Starting Play Store data fetch', {platform: this.name})

    try {
      const service = new GooglePlayConsoleService()
      const apps = await service.fetchAppStatus()

      const fetchDuration = Date.now() - startTime

      logger.info('Play Store data fetch completed', {
        platform: this.name,
        fetchDuration,
        appsCount: apps.length,
      })

      return {
        apps: apps.map(appTrackInfo => ({
          app: {
            packageName: appTrackInfo.packageName,
            title: appTrackInfo.packageName,
          },
          tracks: Object.entries(appTrackInfo.tracks).map(([trackName, trackInfo]) => ({
            track: trackName,
            status: trackInfo.status as any,
            releases:
              trackInfo.versionCodes.length > 0
                ? [
                    {
                      versionCodes: trackInfo.versionCodes,
                      status: trackInfo.status as any,
                    },
                  ]
                : [],
          })),
          versions: Object.entries(appTrackInfo.tracks).flatMap(([, trackInfo]) =>
            trackInfo.versionCodes.map(versionCode => ({
              versionCode,
              versionName: versionCode.toString(),
              status: trackInfo.status,
              track: trackInfo.track,
            })),
          ),
        })),
        timestamp: new Date(),
        fetchDuration,
      }
    } catch (error) {
      const fetchDuration = Date.now() - startTime
      logger.error('Play Store data fetch failed', {
        platform: this.name,
        error: (error as Error).message,
        fetchDuration,
      })
      throw error
    }
  }

  async processData(data: PlayStoreResponse): Promise<NotificationPayload[]> {
    const notifications: NotificationPayload[] = []

    for (const appData of data.apps) {
      const {app, tracks, versions} = appData

      for (const track of tracks) {
        for (const release of track.releases) {
          for (const versionCode of release.versionCodes) {
            const version = versions.find(v => v.versionCode === versionCode)
            if (version) {
              const notificationData = await this.analyzeVersion(app, version, track)

              if (notificationData.statusChange || notificationData.isNewVersion) {
                const notification: NotificationPayload = {
                  platform: 'play-store',
                  appName: environmentConfig.appName || app.packageName,
                  status: version.status,
                  message: this.generateMessage(notificationData),
                  timestamp: new Date(),
                  metadata: {
                    packageName: app.packageName,
                    versionCode: version.versionCode,
                    versionName: version.versionName,
                    track: track.track,
                    isNewVersion: notificationData.isNewVersion,
                    statusChange: notificationData.statusChange,
                    previousStatus: notificationData.previousStatus,
                    previousVersionCode: notificationData.versionComparison?.versionCodeChanged
                      ? this.getPreviousVersionCode(app.packageName, version.versionCode)
                      : version.versionCode,
                    userFraction: version.userFraction,
                    releaseNotes: version.releaseNotes,
                  },
                }

                notifications.push(notification)
                this.updateStoredVersionInfo(app.packageName, version, track.track)
              }
            }
          }
        }
      }
    }

    logger.info('Play Store data processing completed', {
      platform: this.name,
      notificationsGenerated: notifications.length,
    })

    return notifications
  }

  private analyzeVersion = async (
    app: any,
    version: any,
    track: any,
  ): Promise<PlayStoreNotificationData> => {
    const versionKey = `${app.packageName}-${version.versionCode}-${track.track}`
    const storedVersion = database.get<any>('play-store', versionKey)

    const isNewVersion = !storedVersion
    const statusChange = storedVersion && storedVersion.status !== version.status
    const previousStatus = storedVersion?.status

    return {
      app,
      version,
      track,
      previousStatus,
      statusChange,
      isNewVersion,
      versionComparison: {
        versionCodeChanged: storedVersion && storedVersion.versionCode !== version.versionCode,
        versionNameChanged: storedVersion && storedVersion.versionName !== version.versionName,
        statusChanged: statusChange,
        trackChanged: storedVersion && storedVersion.track !== track.track,
      },
    }
  }

  private generateMessage = (data: PlayStoreNotificationData): string => {
    const {app, version, track, isNewVersion, statusChange, previousStatus} = data

    const appName = app.title || app.packageName
    const versionInfo = version.versionName
      ? `${version.versionName} (${version.versionCode})`
      : `version ${version.versionCode}`

    if (isNewVersion) {
      return `New ${versionInfo} for ${appName} is now ${version.status.formatted()} in ${track.track.formatted()}`
    }

    if (statusChange) {
      return `${versionInfo} for ${appName} in ${track.track.formatted()} changed from ${previousStatus?.formatted()} to ${version.status.formatted()}`
    }

    return `${versionInfo} for ${appName} in ${track.track.formatted()} status: ${version.status.formatted()}`
  }

  private updateStoredVersionInfo = (packageName: string, version: any, track: string): void => {
    const versionKey = `${packageName}-${version.versionCode}-${track}`
    database.set('play-store', versionKey, {
      versionCode: version.versionCode,
      versionName: version.versionName,
      status: version.status,
      track,
      lastChecked: new Date(),
      userFraction: version.userFraction,
    })
  }

  private getPreviousVersionCode = (
    packageName: string,
    currentVersionCode: number,
  ): number | undefined => {
    try {
      const allKeys = database.getAllKeys('play-store')
      const versionKeys = allKeys.filter((key: string) => key.startsWith(`${packageName}-`))

      const versions = versionKeys
        .map((key: string) => {
          const parts = key.split('-')
          return parseInt(parts[1], 10)
        })
        .filter((code: number) => !isNaN(code) && code < currentVersionCode)
        .sort((a: number, b: number) => b - a)

      return versions[0]
    } catch {
      return undefined
    }
  }

  healthCheck = async (): Promise<boolean> => {
    try {
      if (!this.validateConfig()) {
        return false
      }

      logger.info('Play Store processor health check passed', {platform: this.name})
      return true
    } catch (error) {
      logger.error('Play Store processor health check failed', {
        platform: this.name,
        error: (error as Error).message,
      })
      return false
    }
  }
}

export default PlayStoreProcessor
