import environmentConfig from '@/config/environment'
import type {AppTrackInfo, TrackInfo} from '@/types/play-store'
import {google} from 'googleapis'

export class GooglePlayConsoleService {
  private config = environmentConfig.getPlayStoreConfig()

  constructor() {
    if (!this.config.credentials.jsonKeyData) {
      throw new Error(
        'Invalid Google Play authentication configuration. Please provide JSON key data.',
      )
    }
  }

  private getAuthClient = async () => {
    const credentials = JSON.parse(this.config.credentials.jsonKeyData)
    return new google.auth.JWT(credentials.client_email, undefined, credentials.private_key, [
      'https://www.googleapis.com/auth/androidpublisher',
    ])
  }

  private getTrackInfo = async (packageName: string, trackName: string): Promise<TrackInfo> => {
    const auth = await this.getAuthClient()
    const androidpublisher = google.androidpublisher({version: 'v3', auth})

    let editId: string | null = null
    let releases: any[] = []

    try {
      const editResult = await androidpublisher.edits.insert({
        packageName,
      })
      editId = editResult.data.id!

      const trackResult = await androidpublisher.edits.tracks.get({
        packageName,
        editId,
        track: trackName,
      })

      releases = trackResult.data.releases || []
    } catch (error: any) {
      if (error.code !== 404) {
        console.log(`API Error fetching track '${trackName}' for ${packageName}: ${error.message}`)
      }
    } finally {
      if (editId) {
        try {
          await androidpublisher.edits.delete({
            packageName,
            editId,
          })
        } catch {
          // Ignore delete errors
        }
      }
    }

    if (releases && releases.length > 0) {
      const releasesWithVersionCodes = releases.filter(
        r => r.versionCodes && r.versionCodes.length > 0,
      )

      if (releasesWithVersionCodes.length > 0) {
        const latestRelease = releasesWithVersionCodes.reduce((latest, current) => {
          const latestMaxVersion = Math.max(...latest.versionCodes.map(Number))
          const currentMaxVersion = Math.max(...current.versionCodes.map(Number))
          return currentMaxVersion > latestMaxVersion ? current : latest
        })

        const versionCodes = latestRelease.versionCodes.map(Number)

        return {
          track: trackName,
          versionCodes,
          latestVersionCode: Math.max(...versionCodes),
          status: latestRelease.status,
        }
      }
    }

    return {
      track: trackName,
      versionCodes: [],
      latestVersionCode: null,
      status: 'EMPTY',
    }
  }

  private getAppInfo = async (packageName: string): Promise<AppTrackInfo | null> => {
    try {
      const internalTrack = await this.getTrackInfo(packageName, 'internal')
      const alphaTrack = await this.getTrackInfo(packageName, 'alpha')
      const betaTrack = await this.getTrackInfo(packageName, 'beta')
      const productionTrack = await this.getTrackInfo(packageName, 'production')

      return {
        packageName,
        tracks: {
          internal: internalTrack,
          alpha: alphaTrack,
          beta: betaTrack,
          production: productionTrack,
        },
      }
    } catch (error: any) {
      console.log(`Error fetching info for ${packageName}: ${error.message}`)
      return null
    }
  }

  fetchAppStatus = async (): Promise<AppTrackInfo[]> => {
    const packageNames = this.config.appIdentifiers

    if (!packageNames || packageNames.length === 0) {
      throw new Error('No package names provided')
    }

    const apps: AppTrackInfo[] = []

    for (const packageName of packageNames) {
      const appInfo = await this.getAppInfo(packageName.trim())
      if (appInfo) {
        apps.push(appInfo)
      }
    }

    return apps
  }
}
