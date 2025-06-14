import environmentConfig from '@/config/environment'
import type {AppVersionInfo, BuildInfo} from '@/types/app-store'
import {AppStoreConnectAPI} from 'appstore-connect-sdk'
import {AppsApi} from 'appstore-connect-sdk/openapi'

export class AppStoreConnectService {
  private client: AppStoreConnectAPI
  private config = environmentConfig.getAppStoreConfig()

  constructor() {
    if (this.usesAppStoreConnectAuthToken()) {
      this.client = new AppStoreConnectAPI({
        issuerId: this.config.credentials.issuerId!,
        privateKeyId: this.config.credentials.apiKeyId!,
        privateKey: this.config.credentials.apiKey!,
      })
    } else if (this.usesAppStoreConnectAuthCredentials()) {
      throw new Error(
        'Username/password authentication is not supported by the TypeScript SDK. Please use API key authentication.',
      )
    } else {
      throw new Error(
        'Invalid authentication configuration. Please provide either API key credentials.',
      )
    }
  }

  private usesAppStoreConnectAuthToken = (): boolean =>
    !!(
      this.config.credentials.issuerId &&
      this.config.credentials.apiKeyId &&
      this.config.credentials.apiKey
    )

  private usesAppStoreConnectAuthCredentials = (): boolean =>
    !this.usesAppStoreConnectAuthToken() && !!this.config.credentials.username

  private getVersionInfo = async (
    appId: string,
    appName: string,
  ): Promise<Omit<AppVersionInfo, 'builds'>> => {
    try {
      const appsApi = await this.client.create(AppsApi)

      const versionsResponse = await appsApi.appsAppStoreVersionsGetToManyRelated({
        id: appId,
        filterPlatform: ['IOS'],
        limit: 1,
      })

      const latestVersion = versionsResponse.data?.[0]

      if (!latestVersion) {
        console.warn(`No versions found for app ${appId}`)
        return {
          name: appName,
          version: 'Unknown',
          status: 'Unknown',
          appId: appId,
          iconUrl: null,
        }
      }

      return {
        name: appName,
        version: latestVersion.attributes?.versionString || 'Unknown',
        status: latestVersion.attributes?.appStoreState || 'Unknown',
        appId: appId,
        iconUrl: null,
      }
    } catch (error) {
      console.error(`Error fetching version info for app ${appId}:`, error)
      return {
        name: appName,
        version: 'Error',
        status: 'Error',
        appId: appId,
        iconUrl: null,
      }
    }
  }

  private getBuildInfo = async (appId: string): Promise<BuildInfo[]> => {
    try {
      const appsApi = await this.client.create(AppsApi)
      const numberOfBuilds = this.config.numberOfBuilds || 1

      const totalResponse = await appsApi.appsBuildsGetToManyRelated({
        id: appId,
        limit: 1,
      })

      const currentTotal = totalResponse.meta?.paging?.total || 0
      if (currentTotal === 0) {
        return []
      }

      console.log(`Fetching all ${currentTotal} builds using SDK`)

      const buildsResponse = await appsApi.appsBuildsGetToManyRelated({
        id: appId,
        limit: currentTotal,
      })

      console.log(`Fetched ${buildsResponse.data.length} builds out of ${currentTotal} total`)

      const builds =
        buildsResponse.data?.map((build: any) => ({
          version: build.attributes?.version || '',
          uploaded_date: build.attributes?.uploadedDate || '',
          status: build.attributes?.processingState || '',
        })) || []

      return builds
        .sort(
          (a: BuildInfo, b: BuildInfo) =>
            new Date(b.uploaded_date).getTime() - new Date(a.uploaded_date).getTime(),
        )
        .slice(0, numberOfBuilds)
    } catch (error) {
      console.error(`Error fetching build info for app ${appId}:`, error)
      return []
    }
  }

  private getAppVersions = async (): Promise<AppVersionInfo[]> => {
    const appsApi = await this.client.create(AppsApi)
    let apps: any[] = []

    try {
      if (this.config.appIdentifiers.length > 0) {
        const appsResponse = await appsApi.appsGetCollection({
          filterBundleId: this.config.appIdentifiers,
        })
        apps = appsResponse.data || []
      } else {
        const appsResponse = await appsApi.appsGetCollection()
        apps = appsResponse.data || []
      }
    } catch (error) {
      console.error('Error fetching apps:', error)
      return []
    }

    const results: AppVersionInfo[] = []

    for (const app of apps) {
      if (!app.id || !app.attributes?.name) continue

      try {
        const versionInfo = await this.getVersionInfo(app.id, app.attributes.name)
        const buildInfo = await this.getBuildInfo(app.id)

        results.push({
          ...versionInfo,
          builds: buildInfo,
        })
      } catch (error) {
        console.error(`Error processing app ${app.id}:`, error)
      }
    }

    return results
  }

  fetchAppStatus = async (): Promise<AppVersionInfo[]> => this.getAppVersions()
}
