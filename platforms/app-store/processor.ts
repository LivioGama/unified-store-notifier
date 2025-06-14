import environmentConfig from '@/config/environment'
import {AppStoreConnectService} from '@/core/app-store-connect'
import database from '@/core/database'
import logger from '@/core/logger'
import '@/core/string-utilities'
import {
  AppStoreApp,
  AppStoreBuild,
  AppStoreNotificationData,
  AppStoreResponse,
} from '@/types/app-store'
import {NotificationPayload, PlatformProcessor} from '@/types/common'

export class AppStoreProcessor implements PlatformProcessor {
  name = 'app-store'

  validateConfig(): boolean {
    const authMethod = environmentConfig.validateAppStoreCredentials()
    const config = environmentConfig.getAppStoreConfig()
    return authMethod.isValid && config.appIdentifiers.length > 0
  }

  async fetchData(): Promise<Partial<AppStoreResponse>> {
    const startTime = Date.now()
    logger.info('Starting App Store data fetch', {platform: this.name})

    try {
      const service = new AppStoreConnectService()
      const apps = await service.fetchAppStatus()

      const fetchDuration = Date.now() - startTime

      logger.info('App Store data fetch completed', {
        platform: this.name,
        fetchDuration,
        appsCount: apps.length,
      })

      return {
        apps: apps.map(app => ({
          app: {
            bundleId: app.appId,
            name: app.name,
          } as AppStoreApp,
          builds: app.builds.map(build => ({
            version: build.version,
            buildNumber: build.version,
            status: build.status,
            uploadDate: new Date(build.uploaded_date),
            iconUrl: app.iconUrl || undefined,
          })) as AppStoreBuild[],
        })),
        timestamp: new Date(),
        fetchDuration,
      }
    } catch (error) {
      const fetchDuration = Date.now() - startTime
      logger.error('App Store data fetch failed', {
        platform: this.name,
        error: (error as Error).message,
        fetchDuration,
      })
      throw error
    }
  }

  async processData(data: AppStoreResponse): Promise<NotificationPayload[]> {
    const notifications: NotificationPayload[] = []

    for (const appData of data.apps) {
      const {app, builds} = appData

      for (const build of builds) {
        const notificationData = await this.analyzeBuild(app, build)

        if (notificationData.statusChange || notificationData.isNewBuild) {
          const notification: NotificationPayload = {
            platform: 'app-store',
            appName: app.name,
            status: build.status,
            message: this.generateMessage(notificationData),
            timestamp: new Date(),
            metadata: {
              bundleId: app.bundleId,
              version: build.version,
              buildNumber: build.buildNumber,
              appVersion: build.version,
              appStatus: build.status,
              isNewBuild: notificationData.isNewBuild,
              statusChange: notificationData.statusChange,
              previousStatus: notificationData.previousStatus,
              uploadDate: build.uploadDate,
              iconUrl: build.iconUrl || '',
            },
          }

          notifications.push(notification)
          this.updateStoredBuildInfo(app.bundleId, build)
        }
      }
    }

    logger.info('App Store data processing completed', {
      platform: this.name,
      notificationsGenerated: notifications.length,
    })

    return notifications
  }

  private analyzeBuild = async (app: any, build: any): Promise<AppStoreNotificationData> => {
    const buildKey = `${app.bundleId}-${build.version}-${build.buildNumber}`
    const storedBuild = database.get<any>('app-store', buildKey)

    const isNewBuild = !storedBuild
    const statusChange = storedBuild && storedBuild.status !== build.status
    const previousStatus = storedBuild?.status

    return {
      app,
      build,
      previousStatus,
      statusChange,
      isNewBuild,
      buildComparison: {
        versionChanged: storedBuild && storedBuild.version !== build.version,
        buildNumberChanged: storedBuild && storedBuild.buildNumber !== build.buildNumber,
        statusChanged: statusChange,
      },
    }
  }

  private generateMessage = (data: AppStoreNotificationData): string => {
    const {app, build, isNewBuild, statusChange, previousStatus} = data

    if (isNewBuild) {
      return `New build ${build.version} (${build.buildNumber}) for ${app.name} is now ${build.status.formatted()}`
    }

    if (statusChange) {
      return `Build ${build.version} (${build.buildNumber}) for ${app.name} changed from ${previousStatus?.formatted()} to ${build.status.formatted()}`
    }

    return `Build ${build.version} (${build.buildNumber}) for ${app.name} status: ${build.status.formatted()}`
  }

  private updateStoredBuildInfo = (bundleId: string, build: any): void => {
    const buildKey = `${bundleId}-${build.version}-${build.buildNumber}`
    database.set('app-store', buildKey, {
      version: build.version,
      buildNumber: build.buildNumber,
      status: build.status,
      lastChecked: new Date(),
      uploadDate: build.uploadDate,
    })
  }

  healthCheck = async (): Promise<boolean> => {
    try {
      if (!this.validateConfig()) {
        return false
      }

      logger.info('App Store processor health check passed', {platform: this.name})
      return true
    } catch (error) {
      logger.error('App Store processor health check failed', {
        platform: this.name,
        error: (error as Error).message,
      })
      return false
    }
  }
}

export default AppStoreProcessor
