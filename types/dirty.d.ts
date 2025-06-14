declare module 'dirty' {
  interface DirtyDB {
    get(key: string): unknown
    set(key: string, value: unknown): void
    has(key: string): boolean
    rm(key: string): void
    forEach(callback: (key: string, value: unknown) => void): void
    on?(event: string, callback: (...args: any[]) => void): void
  }

  function dirty(path?: string): DirtyDB
  export = dirty
}
