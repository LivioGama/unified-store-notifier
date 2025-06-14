import {DatabaseEntry} from '@/types/common'
import dirty from 'dirty'
import logger from './logger'

interface DirtyDB {
  get(key: string): unknown
  set(key: string, value: unknown): void
  has(key: string): boolean
  rm(key: string): void
  forEach(callback: (key: string, value: unknown) => void): void
  on?: (event: string, callback: (...args: any[]) => void) => void
}

class Database {
  private db: DirtyDB
  private initialized = false

  constructor(dbPath = 'kvstore.db') {
    this.db = dirty(dbPath)
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.db.on?.('load', () => {
      this.initialized = true
      logger.info('Database loaded successfully')
    })

    this.db.on?.('error', (error: Error) => {
      logger.error('Database error', {error: error.message})
    })
  }

  get<T = unknown>(platform: 'app-store' | 'play-store', key: string): T | undefined {
    const entry = this.db.get(key) as DatabaseEntry | undefined
    if (entry && entry.platform === platform) {
      logger.debug('Database get', {platform, key, found: true})
      return entry.value as T
    }
    logger.debug('Database get', {platform, key, found: false})
    return undefined
  }

  set<T = unknown>(platform: 'app-store' | 'play-store', key: string, value: T): void {
    const entry: DatabaseEntry = {
      key,
      value,
      platform,
      timestamp: new Date(),
    }
    this.db.set(key, entry)
    logger.debug('Database set', {platform, key})
  }

  has(platform: 'app-store' | 'play-store', key: string): boolean {
    const entry = this.db.get(key) as DatabaseEntry | undefined
    return entry !== undefined && entry.platform === platform
  }

  delete(platform: 'app-store' | 'play-store', key: string): void {
    const entry = this.db.get(key) as DatabaseEntry | undefined
    if (!entry || entry.platform !== platform) {
      logger.debug('Database delete skipped - key not found or platform mismatch', {platform, key})
      return
    }
    this.db.rm(key)
    logger.debug('Database delete', {platform, key})
  }

  getAllKeys(platform?: 'app-store' | 'play-store'): string[] {
    const keys: string[] = []
    this.db.forEach((key: string) => {
      const entry = this.db.get(key) as DatabaseEntry | undefined
      if (entry && (!platform || entry.platform === platform)) {
        keys.push(key)
      }
    })
    return keys
  }

  isReady(): boolean {
    return this.initialized
  }
}

export const database = new Database()
export default database
