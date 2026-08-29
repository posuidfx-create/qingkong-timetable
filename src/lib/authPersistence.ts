export type AuthPersistenceMode = "local" | "session"

let persistenceMode: AuthPersistenceMode = "local"

export function setAuthPersistence(rememberMe: boolean): void {
  persistenceMode = rememberMe ? "local" : "session"
}

interface SessionStorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export function createAuthStorage(local: SessionStorageAdapter, session: SessionStorageAdapter) {
  return {
    getItem(key: string) {
      const sessionValue = session.getItem(key)
      if (sessionValue !== null) { persistenceMode = "session"; return sessionValue }
      const localValue = local.getItem(key)
      if (localValue !== null) persistenceMode = "local"
      return localValue
    },
    setItem(key: string, value: string) {
      const target = persistenceMode === "local" ? local : session
      const other = persistenceMode === "local" ? session : local
      target.setItem(key, value)
      other.removeItem(key)
    },
    removeItem(key: string) { local.removeItem(key); session.removeItem(key) },
  }
}
