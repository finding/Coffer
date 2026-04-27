export interface CookieItem {
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite: 'lax' | 'strict' | 'no_restriction'
  expirationDate?: number
  storeId: string
}

export interface ClipboardItem {
  cookies: CookieItem[]
  sourceDomain: string
  copiedAt: number
  label?: string
}

export interface CookieFilters {
  keyword: string
  domain: string
  attributes: string[]
  timeRange: { start: number; end: number } | null
}

export interface Settings {
  persistMode: boolean
  theme: 'light' | 'dark'
  maxClipboardItems: number
}

export type CookieAttribute = 'secure' | 'httpOnly' | 'session'

export interface MessagePayload {
  action: 'getClipboard' | 'setClipboard' | 'getSettings' | 'setSettings'
  data?: unknown
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface StorageItem {
  key: string
  value: string
}

export interface StorageClipboardItem {
  items: StorageItem[]
  sourceDomain: string
  storageType: 'local' | 'session'
  copiedAt: number
}
