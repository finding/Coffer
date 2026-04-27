# Chrome Cookie Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension for cookie management with copy/paste across tabs and incognito mode.

**Architecture:** Vue 3 + Pinia for state management. Separate Popup and DevTools apps sharing services layer. Background service worker handles cross-context communication and Chrome Storage persistence.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vite, Tailwind CSS, Chrome Extension MV3, Vitest

---

## File Structure

```
cookie-manager/
├── manifest.json
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── public/
│   └── icons/
├── src/
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── App.vue
│   │   └── components/
│   ├── devtools/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── App.vue
│   │   └── components/
│   ├── background/
│   │   └── index.ts
│   ├── stores/
│   ├── services/
│   ├── types/
│   └── styles/
└── tests/
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `tests/setup.ts`
- Create: `src/styles/main.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "cookie-manager",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "pinia": "^2.1.7",
    "vue": "^3.4.21"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.263",
    "@types/node": "^20.11.24",
    "@vitejs/plugin-vue": "^5.0.4",
    "@vue/test-utils": "^2.4.4",
    "autoprefixer": "^10.4.18",
    "happy-dom": "^13.6.2",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.4",
    "vitest": "^1.3.1",
    "vue-tsc": "^2.0.6"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["chrome", "node"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "tests/**/*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        devtools: resolve(__dirname, 'src/devtools/index.html'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

- [ ] **Step 6: Create tailwind.config.js**

```javascript
export default {
  content: ["./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        chrome: {
          blue: '#4285F4',
          red: '#EA4335',
          yellow: '#FBBC05',
          green: '#34A853'
        }
      }
    }
  },
  plugins: []
}
```

- [ ] **Step 7: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 8: Create tests/setup.ts**

```typescript
import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

config.global.plugins = []

beforeEach(() => {
  setActivePinia(createPinia())
})

const mockChrome = {
  cookies: {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn()
  },
  runtime: {
    onMessage: {
      addListener: vi.fn()
    },
    sendMessage: vi.fn()
  }
}

vi.stubGlobal('chrome', mockChrome)
```

- [ ] **Step 9: Create src/styles/main.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; }
}
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "chore: project setup with Vue 3, Pinia, Vite, Tailwind CSS"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write the type definitions**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add type definitions"
```

---

## Task 3: CookieManager Service

**Files:**
- Create: `src/services/cookieManager.ts`
- Create: `tests/unit/services/cookieManager.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CookieManager } from '@/services/cookieManager'
import type { CookieItem } from '@/types'

describe('CookieManager', () => {
  let cookieManager: CookieManager

  beforeEach(() => {
    cookieManager = new CookieManager()
    vi.clearAllMocks()
  })

  describe('getCookies', () => {
    it('should return cookies for a domain', async () => {
      const mockCookies: chrome.cookies.Cookie[] = [{
        name: 'session', value: 'abc123', domain: '.example.com',
        path: '/', secure: true, httpOnly: false,
        sameSite: 'lax', storeId: '0'
      }]
      vi.mocked(chrome.cookies.getAll).mockResolvedValue(mockCookies)

      const result = await cookieManager.getCookies({ domain: 'example.com' })

      expect(chrome.cookies.getAll).toHaveBeenCalledWith({ domain: 'example.com' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('session')
    })

    it('should return empty array when no cookies', async () => {
      vi.mocked(chrome.cookies.getAll).mockResolvedValue([])
      const result = await cookieManager.getCookies({ domain: 'empty.com' })
      expect(result).toEqual([])
    })
  })

  describe('setCookie', () => {
    it('should set a cookie', async () => {
      const cookie: CookieItem = {
        name: 'test', value: 'value', domain: '.example.com',
        path: '/', secure: false, httpOnly: false,
        sameSite: 'lax', storeId: '0'
      }
      vi.mocked(chrome.cookies.set).mockResolvedValue(cookie as chrome.cookies.Cookie)

      await cookieManager.setCookie(cookie, 'https://example.com')
      expect(chrome.cookies.set).toHaveBeenCalled()
    })
  })

  describe('removeCookie', () => {
    it('should remove a cookie', async () => {
      vi.mocked(chrome.cookies.remove).mockResolvedValue({} as chrome.cookies.Details)
      const result = await cookieManager.removeCookie({ url: 'https://example.com', name: 'test' })
      expect(result).toBe(true)
    })

    it('should return false when cookie not found', async () => {
      vi.mocked(chrome.cookies.remove).mockResolvedValue(null)
      const result = await cookieManager.removeCookie({ url: 'https://example.com', name: 'nonexistent' })
      expect(result).toBe(false)
    })
  })

  describe('filterByKeyword', () => {
    it('should filter by keyword', () => {
      const cookies: CookieItem[] = [
        { name: 'session', value: 'a', domain: '.a.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax', storeId: '0' },
        { name: 'token', value: 'b', domain: '.b.com', path: '/', secure: true, httpOnly: true, sameSite: 'strict', storeId: '0' }
      ]
      const result = cookieManager.filterByKeyword(cookies, 'session')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('session')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run tests/unit/services/cookieManager.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
import type { CookieItem, CookieAttribute } from '@/types'

export class CookieManager {
  async getCookies(params: { domain?: string; url?: string }): Promise<CookieItem[]> {
    const query: chrome.cookies.GetAllDetails = {}
    if (params.domain) query.domain = params.domain
    if (params.url) query.url = params.url

    const cookies = await chrome.cookies.getAll(query)
    return cookies.map(this.mapChromeCookie)
  }

  async setCookie(cookie: CookieItem, url: string): Promise<CookieItem | null> {
    const result = await chrome.cookies.set({
      url, name: cookie.name, value: cookie.value,
      domain: cookie.domain, path: cookie.path,
      secure: cookie.secure, httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite, expirationDate: cookie.expirationDate,
      storeId: cookie.storeId
    })
    return result ? this.mapChromeCookie(result) : null
  }

  async removeCookie(params: { url: string; name: string }): Promise<boolean> {
    const result = await chrome.cookies.remove(params)
    return result !== null
  }

  async setCookies(cookies: CookieItem[], targetUrl: string): Promise<void> {
    for (const cookie of cookies) {
      await this.setCookie(cookie, targetUrl)
    }
  }

  async removeCookies(cookies: { url: string; name: string }[]): Promise<void> {
    for (const c of cookies) {
      await this.removeCookie(c)
    }
  }

  filterByAttributes(cookies: CookieItem[], attributes: CookieAttribute[]): CookieItem[] {
    return cookies.filter(c => attributes.every(attr => {
      if (attr === 'secure') return c.secure
      if (attr === 'httpOnly') return c.httpOnly
      if (attr === 'session') return !c.expirationDate
      return true
    }))
  }

  filterByKeyword(cookies: CookieItem[], keyword: string): CookieItem[] {
    if (!keyword) return cookies
    const k = keyword.toLowerCase()
    return cookies.filter(c =>
      c.name.toLowerCase().includes(k) ||
      c.value.toLowerCase().includes(k) ||
      c.domain.toLowerCase().includes(k)
    )
  }

  filterByTimeRange(cookies: CookieItem[], timeRange: { start: number; end: number } | null): CookieItem[] {
    if (!timeRange) return cookies
    return cookies.filter(c => c.expirationDate && c.expirationDate >= timeRange.start && c.expirationDate <= timeRange.end)
  }

  groupByDomain(cookies: CookieItem[]): Map<string, CookieItem[]> {
    const grouped = new Map<string, CookieItem[]>()
    for (const c of cookies) {
      if (!grouped.has(c.domain)) grouped.set(c.domain, [])
      grouped.get(c.domain)!.push(c)
    }
    return grouped
  }

  private mapChromeCookie(c: chrome.cookies.Cookie): CookieItem {
    return {
      name: c.name, value: c.value, domain: c.domain, path: c.path,
      secure: c.secure, httpOnly: c.httpOnly,
      sameSite: c.sameSite as CookieItem['sameSite'],
      expirationDate: c.expirationDate, storeId: c.storeId
    }
  }
}

export const cookieManager = new CookieManager()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run tests/unit/services/cookieManager.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/services/cookieManager.ts tests/unit/services/cookieManager.test.ts
git commit -m "feat: implement CookieManager service with tests"
```

---

## Task 4: StorageService

**Files:**
- Create: `src/services/storageService.ts`
- Create: `tests/unit/services/storageService.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from '@/services/storageService'
import type { Settings, ClipboardItem } from '@/types'

describe('StorageService', () => {
  let storageService: StorageService

  beforeEach(() => {
    storageService = new StorageService()
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should return default settings when none stored', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({})
      const result = await storageService.getSettings()
      expect(result.persistMode).toBe(false)
      expect(result.theme).toBe('light')
      expect(result.maxClipboardItems).toBe(10)
    })

    it('should return stored settings', async () => {
      const stored: Settings = { persistMode: true, theme: 'dark', maxClipboardItems: 5 }
      vi.mocked(chrome.storage.local.get).mockResolvedValue({ settings: stored })
      const result = await storageService.getSettings()
      expect(result.persistMode).toBe(true)
    })
  })

  describe('saveSettings', () => {
    it('should save settings', async () => {
      const settings: Settings = { persistMode: true, theme: 'dark', maxClipboardItems: 5 }
      await storageService.saveSettings(settings)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ settings })
    })
  })

  describe('getClipboard', () => {
    it('should return empty array when none stored', async () => {
      vi.mocked(chrome.storage.local.get).mockResolvedValue({})
      const result = await storageService.getClipboard()
      expect(result).toEqual([])
    })
  })

  describe('exportCookies', () => {
    it('should export cookies as JSON', async () => {
      const cookies = [{ name: 'a', value: 'b', domain: '.c.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax' as const, storeId: '0' }]
      const result = await storageService.exportCookies(cookies)
      expect(JSON.parse(result)).toEqual(cookies)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run tests/unit/services/storageService.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
import type { Settings, ClipboardItem, CookieItem } from '@/types'

const DEFAULT_SETTINGS: Settings = { persistMode: false, theme: 'light', maxClipboardItems: 10 }

export class StorageService {
  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get('settings')
    return result.settings ?? DEFAULT_SETTINGS
  }

  async saveSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ settings })
  }

  async getClipboard(): Promise<ClipboardItem[]> {
    const result = await chrome.storage.local.get('clipboard')
    return result.clipboard ?? []
  }

  async saveClipboard(items: ClipboardItem[]): Promise<void> {
    await chrome.storage.local.set({ clipboard: items })
  }

  async clearClipboard(): Promise<void> {
    await chrome.storage.local.remove('clipboard')
  }

  async exportCookies(cookies: CookieItem[]): Promise<string> {
    return JSON.stringify(cookies, null, 2)
  }

  async importCookies(json: string): Promise<CookieItem[]> {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) throw new Error('Invalid format')
    return parsed
  }
}

export const storageService = new StorageService()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run tests/unit/services/storageService.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/services/storageService.ts tests/unit/services/storageService.test.ts
git commit -m "feat: implement StorageService with tests"
```

---

## Task 5: ClipboardService

**Files:**
- Create: `src/services/clipboardService.ts`
- Create: `tests/unit/services/clipboardService.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClipboardService } from '@/services/clipboardService'
import type { CookieItem, ClipboardItem } from '@/types'

describe('ClipboardService', () => {
  let clipboardService: ClipboardService
  const mockCookies: CookieItem[] = [
    { name: 'session', value: 'abc', domain: '.example.com', path: '/', secure: true, httpOnly: false, sameSite: 'lax', storeId: '0' }
  ]

  beforeEach(() => {
    clipboardService = new ClipboardService()
    vi.clearAllMocks()
  })

  describe('copy', () => {
    it('should create clipboard item', () => {
      const item = clipboardService.copy(mockCookies, 'example.com')
      expect(item.cookies).toEqual(mockCookies)
      expect(item.sourceDomain).toBe('example.com')
      expect(item.copiedAt).toBeDefined()
    })

    it('should add label when provided', () => {
      const item = clipboardService.copy(mockCookies, 'example.com', 'My Session')
      expect(item.label).toBe('My Session')
    })
  })

  describe('validateForPaste', () => {
    it('should return true for valid cookies', () => {
      const item: ClipboardItem = { cookies: mockCookies, sourceDomain: 'example.com', copiedAt: Date.now() }
      const result = clipboardService.validateForPaste(item)
      expect(result.valid).toBe(true)
    })

    it('should return false for empty cookies', () => {
      const item: ClipboardItem = { cookies: [], sourceDomain: 'example.com', copiedAt: Date.now() }
      const result = clipboardService.validateForPaste(item)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('No cookies to paste')
    })
  })

  describe('transformForDomain', () => {
    it('should transform cookies for target domain', () => {
      const cookies = clipboardService.transformForDomain(mockCookies, '.newdomain.com')
      expect(cookies[0].domain).toBe('.newdomain.com')
      expect(cookies[0].name).toBe('session')
    })
  })

  describe('mergeClipboardItems', () => {
    it('should limit items to max count', () => {
      const items: ClipboardItem[] = Array.from({ length: 15 }, (_, i) => ({
        cookies: mockCookies, sourceDomain: `domain${i}.com`, copiedAt: Date.now() + i
      }))
      const result = clipboardService.mergeClipboardItems(items, 10)
      expect(result.length).toBe(10)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run tests/unit/services/clipboardService.test.ts`

- [ ] **Step 3: Write implementation**

```typescript
import type { CookieItem, ClipboardItem } from '@/types'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export class ClipboardService {
  copy(cookies: CookieItem[], sourceDomain: string, label?: string): ClipboardItem {
    return {
      cookies: [...cookies],
      sourceDomain,
      copiedAt: Date.now(),
      label
    }
  }

  validateForPaste(item: ClipboardItem | null): ValidationResult {
    if (!item) return { valid: false, error: 'No item in clipboard' }
    if (!item.cookies || item.cookies.length === 0) return { valid: false, error: 'No cookies to paste' }
    return { valid: true }
  }

  transformForDomain(cookies: CookieItem[], targetDomain: string): CookieItem[] {
    return cookies.map(c => ({ ...c, domain: targetDomain }))
  }

  mergeClipboardItems(items: ClipboardItem[], maxItems: number): ClipboardItem[] {
    return [...items].sort((a, b) => b.copiedAt - a.copiedAt).slice(0, maxItems)
  }
}

export const clipboardService = new ClipboardService()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run tests/unit/services/clipboardService.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/services/clipboardService.ts tests/unit/services/clipboardService.test.ts
git commit -m "feat: implement ClipboardService with tests"
```

---

## Task 6: Pinia Stores

**Files:**
- Create: `src/stores/cookieStore.ts`
- Create: `src/stores/clipboardStore.ts`
- Create: `src/stores/settingStore.ts`
- Create: `tests/unit/stores/cookieStore.test.ts`
- Create: `tests/unit/stores/clipboardStore.test.ts`

- [ ] **Step 1: Write failing test for cookieStore**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCookieStore } from '@/stores/cookieStore'
import type { CookieItem } from '@/types'

describe('cookieStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockCookies: CookieItem[] = [
    { name: 'a', value: '1', domain: '.example.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax', storeId: '0' },
    { name: 'b', value: '2', domain: '.example.com', path: '/', secure: true, httpOnly: true, sameSite: 'strict', storeId: '0' }
  ]

  describe('loadCookies', () => {
    it('should load and store cookies', async () => {
      vi.mocked(chrome.cookies.getAll).mockResolvedValue([])
      const store = useCookieStore()
      await store.loadCookies('example.com')
      expect(chrome.cookies.getAll).toHaveBeenCalled()
    })
  })

  describe('filteredCookies', () => {
    it('should filter by keyword', () => {
      const store = useCookieStore()
      store.cookies = mockCookies
      store.filters.keyword = 'a'
      expect(store.filteredCookies).toHaveLength(1)
      expect(store.filteredCookies[0].name).toBe('a')
    })

    it('should filter by attributes', () => {
      const store = useCookieStore()
      store.cookies = mockCookies
      store.filters.attributes = ['secure']
      expect(store.filteredCookies).toHaveLength(1)
      expect(store.filteredCookies[0].secure).toBe(true)
    })
  })

  describe('groupedByDomain', () => {
    it('should group cookies by domain', () => {
      const store = useCookieStore()
      store.cookies = [
        ...mockCookies,
        { name: 'c', value: '3', domain: '.other.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax', storeId: '0' }
      ]
      expect(store.groupedByDomain.size).toBe(2)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run tests/unit/stores/cookieStore.test.ts`

- [ ] **Step 3: Write cookieStore implementation**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CookieItem, CookieFilters, CookieAttribute } from '@/types'
import { cookieManager } from '@/services/cookieManager'

export const useCookieStore = defineStore('cookies', () => {
  const cookies = ref<CookieItem[]>([])
  const currentDomain = ref<string>('')
  const filters = ref<CookieFilters>({
    keyword: '', domain: '', attributes: [], timeRange: null
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filteredCookies = computed(() => {
    let result = cookies.value
    if (filters.value.keyword) {
      result = cookieManager.filterByKeyword(result, filters.value.keyword)
    }
    if (filters.value.attributes.length > 0) {
      result = cookieManager.filterByAttributes(result, filters.value.attributes as CookieAttribute[])
    }
    if (filters.value.timeRange) {
      result = cookieManager.filterByTimeRange(result, filters.value.timeRange)
    }
    return result
  })

  const groupedByDomain = computed(() => cookieManager.groupByDomain(filteredCookies.value))
  const cookieCount = computed(() => cookies.value.length)

  async function loadCookies(domain: string): Promise<void> {
    loading.value = true
    error.value = null
    currentDomain.value = domain
    try {
      cookies.value = await cookieManager.getCookies({ domain })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load cookies'
    } finally {
      loading.value = false
    }
  }

  async function deleteCookie(url: string, name: string): Promise<void> {
    await cookieManager.removeCookie({ url, name })
    cookies.value = cookies.value.filter(c => c.name !== name)
  }

  async function deleteAllCookies(): Promise<void> {
    const url = `https://${currentDomain.value}`
    for (const c of cookies.value) {
      await cookieManager.removeCookie({ url, name: c.name })
    }
    cookies.value = []
  }

  function resetFilters(): void {
    filters.value = { keyword: '', domain: '', attributes: [], timeRange: null }
  }

  return {
    cookies, currentDomain, filters, loading, error,
    filteredCookies, groupedByDomain, cookieCount,
    loadCookies, deleteCookie, deleteAllCookies, resetFilters
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run tests/unit/stores/cookieStore.test.ts`

- [ ] **Step 5: Write failing test for clipboardStore**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useClipboardStore } from '@/stores/clipboardStore'
import type { CookieItem } from '@/types'

describe('clipboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockCookies: CookieItem[] = [
    { name: 'test', value: 'abc', domain: '.example.com', path: '/', secure: false, httpOnly: false, sameSite: 'lax', storeId: '0' }
  ]

  describe('copyCookies', () => {
    it('should add item to clipboard', () => {
      const store = useClipboardStore()
      store.copyCookies(mockCookies, 'example.com')
      expect(store.items).toHaveLength(1)
      expect(store.items[0].sourceDomain).toBe('example.com')
    })
  })

  describe('activeItem', () => {
    it('should return item at activeIndex', () => {
      const store = useClipboardStore()
      store.copyCookies(mockCookies, 'example.com')
      store.copyCookies([...mockCookies], 'other.com')
      store.activeIndex = 1
      expect(store.activeItem?.sourceDomain).toBe('other.com')
    })
  })

  describe('clear', () => {
    it('should clear all items', () => {
      const store = useClipboardStore()
      store.copyCookies(mockCookies, 'example.com')
      store.clear()
      expect(store.items).toHaveLength(0)
    })
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test:run tests/unit/stores/clipboardStore.test.ts`

- [ ] **Step 7: Write clipboardStore implementation**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CookieItem, ClipboardItem } from '@/types'
import { clipboardService } from '@/services/clipboardService'
import { storageService } from '@/services/storageService'
import { useSettingStore } from './settingStore'

export const useClipboardStore = defineStore('clipboard', () => {
  const items = ref<ClipboardItem[]>([])
  const activeIndex = ref(0)
  const persistMode = ref(false)

  const activeItem = computed(() => items.value[activeIndex.value] ?? null)
  const itemCount = computed(() => items.value.length)

  async function loadFromStorage(): Promise<void> {
    items.value = await storageService.getClipboard()
  }

  async function copyCookies(cookies: CookieItem[], sourceDomain: string, label?: string): Promise<void> {
    const settingStore = useSettingStore()
    const item = clipboardService.copy(cookies, sourceDomain, label)
    items.value.unshift(item)
    items.value = clipboardService.mergeClipboardItems(items.value, settingStore.maxClipboardItems)
    if (persistMode.value) {
      await storageService.saveClipboard(items.value)
    }
  }

  async function pasteCookies(targetDomain: string): Promise<CookieItem[] | null> {
    const item = activeItem.value
    const validation = clipboardService.validateForPaste(item)
    if (!validation.valid) return null
    return clipboardService.transformForDomain(item!.cookies, targetDomain)
  }

  function setActiveIndex(index: number): void {
    activeIndex.value = Math.max(0, Math.min(index, items.value.length - 1))
  }

  async function removeItem(index: number): Promise<void> {
    items.value.splice(index, 1)
    if (activeIndex.value >= items.value.length) {
      activeIndex.value = Math.max(0, items.value.length - 1)
    }
    if (persistMode.value) {
      await storageService.saveClipboard(items.value)
    }
  }

  async function clear(): Promise<void> {
    items.value = []
    activeIndex.value = 0
    await storageService.clearClipboard()
  }

  return {
    items, activeIndex, persistMode, activeItem, itemCount,
    loadFromStorage, copyCookies, pasteCookies, setActiveIndex, removeItem, clear
  }
})
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test:run tests/unit/stores/clipboardStore.test.ts`

- [ ] **Step 9: Write settingStore implementation**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '@/types'
import { storageService } from '@/services/storageService'

export const useSettingStore = defineStore('settings', () => {
  const persistMode = ref(false)
  const theme = ref<'light' | 'dark'>('light')
  const maxClipboardItems = ref(10)

  async function load(): Promise<void> {
    const settings = await storageService.getSettings()
    persistMode.value = settings.persistMode
    theme.value = settings.theme
    maxClipboardItems.value = settings.maxClipboardItems
  }

  async function save(): Promise<void> {
    await storageService.saveSettings({
      persistMode: persistMode.value,
      theme: theme.value,
      maxClipboardItems: maxClipboardItems.value
    })
  }

  function updateSettings(newSettings: Partial<Settings>): void {
    if (newSettings.persistMode !== undefined) persistMode.value = newSettings.persistMode
    if (newSettings.theme !== undefined) theme.value = newSettings.theme
    if (newSettings.maxClipboardItems !== undefined) maxClipboardItems.value = newSettings.maxClipboardItems
  }

  return { persistMode, theme, maxClipboardItems, load, save, updateSettings }
})
```

- [ ] **Step 10: Commit**

```bash
git add src/stores tests/unit/stores
git commit -m "feat: implement Pinia stores with tests"
```

---

## Task 7: Background Service Worker

**Files:**
- Create: `src/background/index.ts`

- [ ] **Step 1: Write background service worker**

```typescript
import { storageService } from '@/services/storageService'
import type { MessagePayload, MessageResponse } from '@/types'

chrome.runtime.onInstalled.addListener(() => {
  console.log('Cookie Manager installed')
})

chrome.cookies.onChanged.addListener((changeInfo) => {
  chrome.runtime.sendMessage({
    type: 'COOKIE_CHANGED',
    data: changeInfo
  }).catch(() => {})
})

chrome.runtime.onMessage.addListener((message: MessagePayload, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({ success: false, error: error.message })
    })
  return true
})

async function handleMessage(message: MessagePayload): Promise<MessageResponse> {
  switch (message.action) {
    case 'getClipboard':
      return { success: true, data: await storageService.getClipboard() }
    case 'setClipboard':
      await storageService.saveClipboard(message.data as Parameters<typeof storageService.saveClipboard>[0])
      return { success: true }
    case 'getSettings':
      return { success: true, data: await storageService.getSettings() }
    case 'setSettings':
      await storageService.saveSettings(message.data as Parameters<typeof storageService.saveSettings>[0])
      return { success: true }
    default:
      return { success: false, error: 'Unknown action' }
  }
}

export {}
```

- [ ] **Step 2: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: implement background service worker"
```

---

## Task 8: Manifest and Icons

**Files:**
- Create: `manifest.json`
- Create: `public/icons/icon16.png`
- Create: `public/icons/icon48.png`
- Create: `public/icons/icon128.png`

- [ ] **Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Cookie Manager",
  "version": "1.0.0",
  "description": "Manage cookies with copy/paste across tabs and incognito mode",
  "permissions": ["cookies", "storage", "activeTab", "tabs"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "devtools_page": "src/devtools/index.html",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "incognito": "split"
}
```

- [ ] **Step 2: Create placeholder icons**

Run: `mkdir -p public/icons`

Create simple placeholder PNG icons (16x16, 48x48, 128x128) using any image editor or online tool. For development, any simple icon will work.

- [ ] **Step 3: Commit**

```bash
git add manifest.json public/icons
git commit -m "feat: add manifest and icon placeholders"
```

---

## Task 9: Popup Application

**Files:**
- Create: `src/popup/index.html`
- Create: `src/popup/main.ts`
- Create: `src/popup/App.vue`
- Create: `src/popup/components/StatusCard.vue`
- Create: `src/popup/components/QuickActions.vue`

- [ ] **Step 1: Create popup index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cookie Manager</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@/styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 3: Create StatusCard.vue**

```vue
<template>
  <div class="bg-white rounded-lg shadow p-4 mb-4">
    <div class="text-sm text-gray-500 mb-1">Current Domain</div>
    <div class="text-lg font-semibold text-gray-900 truncate">{{ domain }}</div>
    <div class="mt-2 flex items-center justify-between">
      <span class="text-sm text-gray-500">Cookies</span>
      <span class="text-2xl font-bold text-chrome-blue">{{ count }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ domain: string; count: number }>()
</script>
```

- [ ] **Step 4: Create QuickActions.vue**

```vue
<template>
  <div class="space-y-2">
    <button @click="$emit('copy')" :disabled="loading"
      class="w-full py-2 px-4 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors">
      Copy All Cookies
    </button>
    <button @click="$emit('paste')" :disabled="loading || !hasClipboard"
      class="w-full py-2 px-4 bg-chrome-green text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors">
      Paste Cookies
    </button>
    <button @click="$emit('delete')" :disabled="loading || count === 0"
      class="w-full py-2 px-4 bg-chrome-red text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
      Delete All Cookies
    </button>
    <div class="flex gap-2 pt-2">
      <button @click="$emit('import')"
        class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
        Import
      </button>
      <button @click="$emit('export')" :disabled="count === 0"
        class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
        Export
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ loading: boolean; hasClipboard: boolean; count: number }>()
defineEmits<{ copy: []; paste: []; delete: []; import: []; export: [] }>()
</script>
```

- [ ] **Step 5: Create App.vue**

```vue
<template>
  <div class="w-80 p-4 bg-gray-50 min-h-[400px]">
    <StatusCard :domain="currentDomain" :count="cookieCount" />
    <QuickActions
      :loading="loading"
      :has-clipboard="hasClipboardItems"
      :count="cookieCount"
      @copy="handleCopy"
      @paste="handlePaste"
      @delete="handleDelete"
      @import="handleImport"
      @export="handleExport"
    />
    <div v-if="message" :class="['mt-4 p-2 rounded text-sm', messageClass]">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCookieStore } from '@/stores/cookieStore'
import { useClipboardStore } from '@/stores/clipboardStore'
import { useSettingStore } from '@/stores/settingStore'
import { cookieManager } from '@/services/cookieManager'
import { storageService } from '@/services/storageService'
import StatusCard from './components/StatusCard.vue'
import QuickActions from './components/QuickActions.vue'

const cookieStore = useCookieStore()
const clipboardStore = useClipboardStore()
const settingStore = useSettingStore()

const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const currentDomain = computed(() => cookieStore.currentDomain)
const cookieCount = computed(() => cookieStore.cookieCount)
const hasClipboardItems = computed(() => clipboardStore.itemCount > 0)

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

async function init() {
  loading.value = true
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url) {
      const url = new URL(tab.url)
      await cookieStore.loadCookies(url.hostname)
    }
    await settingStore.load()
    await clipboardStore.loadFromStorage()
  } finally {
    loading.value = false
  }
}

async function handleCopy() {
  loading.value = true
  try {
    await clipboardStore.copyCookies(cookieStore.cookies, cookieStore.currentDomain)
    showMessage(`Copied ${cookieStore.cookieCount} cookies`)
  } catch { showMessage('Failed to copy cookies', 'error') }
  finally { loading.value = false }
}

async function handlePaste() {
  loading.value = true
  try {
    const cookies = await clipboardStore.pasteCookies(cookieStore.currentDomain)
    if (!cookies) { showMessage('No cookies to paste', 'error'); return }
    await cookieManager.setCookies(cookies, `https://${cookieStore.currentDomain}`)
    await cookieStore.loadCookies(cookieStore.currentDomain)
    showMessage(`Pasted ${cookies.length} cookies`)
  } catch { showMessage('Failed to paste cookies', 'error') }
  finally { loading.value = false }
}

async function handleDelete() {
  loading.value = true
  try {
    await cookieStore.deleteAllCookies()
    showMessage('All cookies deleted')
  } catch { showMessage('Failed to delete cookies', 'error') }
  finally { loading.value = false }
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    loading.value = true
    try {
      const text = await file.text()
      const cookies = await storageService.importCookies(text)
      await cookieManager.setCookies(cookies, `https://${cookieStore.currentDomain}`)
      await cookieStore.loadCookies(cookieStore.currentDomain)
      showMessage(`Imported ${cookies.length} cookies`)
    } catch { showMessage('Failed to import cookies', 'error') }
    finally { loading.value = false }
  }
  input.click()
}

async function handleExport() {
  const json = await storageService.exportCookies(cookieStore.cookies)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cookies-${cookieStore.currentDomain}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  showMessage('Cookies exported')
}

onMounted(init)
</script>
```

- [ ] **Step 6: Commit**

```bash
git add src/popup
git commit -m "feat: implement Popup application with quick actions"
```

---

## Task 10: DevTools Application

**Files:**
- Create: `src/devtools/index.html`
- Create: `src/devtools/main.ts`
- Create: `src/devtools/App.vue`
- Create: `src/devtools/components/FilterBar.vue`
- Create: `src/devtools/components/CookieList.vue`
- Create: `src/devtools/components/CookieDetail.vue`
- Create: `src/devtools/components/BatchActions.vue`
- Create: `src/devtools/components/SettingsPanel.vue`

- [ ] **Step 1: Create devtools index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cookie Manager DevTools</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create devtools main.ts**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@/styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

- [ ] **Step 3: Create FilterBar.vue**

```vue
<template>
  <div class="flex gap-2 p-4 bg-white border-b">
    <input v-model="keyword" type="text" placeholder="Search cookies..."
      class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue"
      @input="$emit('update:keyword', keyword)" />
    <select v-model="attribute"
      class="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue"
      @change="$emit('update:attribute', attribute)">
      <option value="">All attributes</option>
      <option value="secure">Secure</option>
      <option value="httpOnly">HttpOnly</option>
      <option value="session">Session</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const keyword = ref('')
const attribute = ref('')
defineEmits<{ 'update:keyword': [string]; 'update:attribute': [string] }>()
</script>
```

- [ ] **Step 4: Create CookieList.vue**

```vue
<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th class="w-8 p-2"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th class="text-left p-2">Name</th>
          <th class="text-left p-2">Domain</th>
          <th class="text-left p-2">Path</th>
          <th class="text-center p-2">Secure</th>
          <th class="text-center p-2">HttpOnly</th>
          <th class="text-center p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in cookies" :key="`${c.domain}-${c.name}`"
          class="border-b hover:bg-gray-50" :class="{ 'bg-blue-50': selected.has(c) }">
          <td class="p-2"><input type="checkbox" :checked="selected.has(c)" @change="toggleSelect(c)" /></td>
          <td class="p-2 font-mono text-xs truncate max-w-[200px]">{{ c.name }}</td>
          <td class="p-2 text-gray-500">{{ c.domain }}</td>
          <td class="p-2 text-gray-500">{{ c.path }}</td>
          <td class="p-2 text-center"><span v-if="c.secure" class="text-chrome-green">✓</span></td>
          <td class="p-2 text-center"><span v-if="c.httpOnly" class="text-chrome-yellow">✓</span></td>
          <td class="p-2 text-center">
            <button @click="$emit('edit', c)" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">Edit</button>
            <button @click="$emit('delete', c)" class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 ml-1">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="cookies.length === 0" class="p-8 text-center text-gray-500">No cookies found</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CookieItem } from '@/types'

const props = defineProps<{ cookies: CookieItem[]; selected: Set<CookieItem> }>()
const emit = defineEmits<{ 'update:selected': [Set<CookieItem>]; 'edit': [CookieItem]; 'delete': [CookieItem] }>()

const allSelected = computed(() => props.cookies.length > 0 && props.cookies.every(c => props.selected.has(c)))

function toggleSelectAll() {
  const newSelected = new Set(props.selected)
  if (allSelected.value) props.cookies.forEach(c => newSelected.delete(c))
  else props.cookies.forEach(c => newSelected.add(c))
  emit('update:selected', newSelected)
}

function toggleSelect(cookie: CookieItem) {
  const newSelected = new Set(props.selected)
  if (newSelected.has(cookie)) newSelected.delete(cookie)
  else newSelected.add(cookie)
  emit('update:selected', newSelected)
}
</script>
```

- [ ] **Step 5: Create CookieDetail.vue**

```vue
<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto">
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="text-lg font-semibold">{{ isNew ? 'New Cookie' : 'Edit Cookie' }}</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name</label>
          <input v-model="form.name" type="text" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Value</label>
          <textarea v-model="form.value" required rows="3"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Domain</label>
            <input v-model="form.domain" type="text" required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Path</label>
            <input v-model="form.path" type="text" required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
          </div>
        </div>
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input v-model="form.secure" type="checkbox" class="rounded" />
            <span class="text-sm">Secure</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.httpOnly" type="checkbox" class="rounded" />
            <span class="text-sm">HttpOnly</span>
          </label>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">SameSite</label>
          <select v-model="form.sameSite"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue">
            <option value="lax">Lax</option>
            <option value="strict">Strict</option>
            <option value="no_restriction">None</option>
          </select>
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" @click="$emit('close')" class="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-chrome-blue text-white rounded-lg hover:bg-blue-600">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CookieItem } from '@/types'

const props = defineProps<{ cookie?: CookieItem; domain: string }>()
const emit = defineEmits<{ close: []; save: [CookieItem] }>()

const isNew = !props.cookie
const form = ref<CookieItem>({
  name: '', value: '', domain: props.domain, path: '/',
  secure: false, httpOnly: false, sameSite: 'lax', storeId: '0',
  ...props.cookie
})

watch(() => props.cookie, (c) => { if (c) form.value = { ...c } }, { immediate: true })

function handleSubmit() { emit('save', form.value) }
</script>
```

- [ ] **Step 6: Create BatchActions.vue**

```vue
<template>
  <div class="p-4 bg-gray-50 border-t flex gap-2">
    <span class="text-sm text-gray-500 self-center mr-4">{{ selectedCount }} selected</span>
    <button @click="$emit('copy')" :disabled="selectedCount === 0"
      class="px-4 py-2 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">Copy</button>
    <button @click="$emit('delete')" :disabled="selectedCount === 0"
      class="px-4 py-2 bg-chrome-red text-white rounded-lg hover:bg-red-600 disabled:opacity-50">Delete</button>
    <button @click="$emit('export')" :disabled="selectedCount === 0"
      class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">Export</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ selectedCount: number }>()
defineEmits<{ copy: []; delete: []; export: [] }>()
</script>
```

- [ ] **Step 7: Create SettingsPanel.vue**

```vue
<template>
  <div class="p-4 space-y-4">
    <h3 class="text-lg font-semibold mb-4">Settings</h3>
    <div class="flex items-center justify-between">
      <div>
        <div class="font-medium">Persist Clipboard</div>
        <div class="text-sm text-gray-500">Save clipboard to storage</div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input v-model="persistMode" type="checkbox" class="sr-only peer" @change="handlePersistChange" />
        <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-chrome-blue rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-chrome-blue"></div>
      </label>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <div class="font-medium">Max Clipboard Items</div>
        <div class="text-sm text-gray-500">Maximum saved clipboard items</div>
      </div>
      <input v-model.number="maxItems" type="number" min="1" max="50"
        class="w-20 px-2 py-1 border rounded" @change="handleMaxItemsChange" />
    </div>
    <div class="pt-4 border-t">
      <button @click="$emit('close')" class="w-full py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingStore } from '@/stores/settingStore'

const emit = defineEmits<{ close: [] }>()
const settingStore = useSettingStore()
const persistMode = ref(false)
const maxItems = ref(10)

onMounted(async () => {
  await settingStore.load()
  persistMode.value = settingStore.persistMode
  maxItems.value = settingStore.maxClipboardItems
})

async function handlePersistChange() {
  settingStore.updateSettings({ persistMode: persistMode.value })
  await settingStore.save()
}

async function handleMaxItemsChange() {
  settingStore.updateSettings({ maxClipboardItems: maxItems.value })
  await settingStore.save()
}
</script>
```

- [ ] **Step 8: Create App.vue**

```vue
<template>
  <div class="h-screen flex flex-col bg-white">
    <FilterBar @update:keyword="filters.keyword = $event" @update:attribute="filters.attributes = $event ? [$event] : []" />
    <CookieList :cookies="filteredCookies" :selected="selectedCookies"
      @update:selected="selectedCookies = $event" @edit="handleEdit" @delete="handleDelete" />
    <BatchActions :selected-count="selectedCookies.size" @copy="handleBatchCopy" @delete="handleBatchDelete" @export="handleBatchExport" />
    <CookieDetail v-if="editingCookie" :cookie="editingCookie" :domain="currentDomain"
      @close="editingCookie = null" @save="handleSave" />
    <CookieDetail v-if="creating" :domain="currentDomain" @close="creating = false" @save="handleCreate" />
    <div v-if="showSettings" class="fixed inset-0 bg-black/50 z-50" @click.self="showSettings = false">
      <div class="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
        <SettingsPanel @close="showSettings = false" />
      </div>
    </div>
    <div class="absolute top-2 right-2 flex gap-2">
      <button @click="creating = true" class="px-3 py-1 bg-chrome-blue text-white rounded hover:bg-blue-600">+ New</button>
      <button @click="showSettings = true" class="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">⚙ Settings</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useCookieStore } from '@/stores/cookieStore'
import { useClipboardStore } from '@/stores/clipboardStore'
import { cookieManager } from '@/services/cookieManager'
import { storageService } from '@/services/storageService'
import type { CookieItem } from '@/types'
import FilterBar from './components/FilterBar.vue'
import CookieList from './components/CookieList.vue'
import CookieDetail from './components/CookieDetail.vue'
import BatchActions from './components/BatchActions.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const cookieStore = useCookieStore()
const clipboardStore = useClipboardStore()

const selectedCookies = ref(new Set<CookieItem>())
const editingCookie = ref<CookieItem | null>(null)
const creating = ref(false)
const showSettings = ref(false)
const filters = reactive({ keyword: '', attributes: [] as string[] })

const currentDomain = computed(() => cookieStore.currentDomain)

const filteredCookies = computed(() => {
  let result = cookieStore.cookies
  if (filters.keyword) result = cookieManager.filterByKeyword(result, filters.keyword)
  if (filters.attributes.length > 0) result = cookieManager.filterByAttributes(result, filters.attributes as ('secure' | 'httpOnly' | 'session')[])
  return result
})

onMounted(() => clipboardStore.loadFromStorage())

function handleEdit(cookie: CookieItem) { editingCookie.value = { ...cookie } }

async function handleDelete(cookie: CookieItem) {
  const url = `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`
  await cookieStore.deleteCookie(url, cookie.name)
  selectedCookies.value.delete(cookie)
}

async function handleSave(cookie: CookieItem) {
  const url = `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`
  await cookieManager.setCookie(cookie, url)
  await cookieStore.loadCookies(cookieStore.currentDomain)
  editingCookie.value = null
}

async function handleCreate(cookie: CookieItem) {
  const url = `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`
  await cookieManager.setCookie(cookie, url)
  await cookieStore.loadCookies(cookieStore.currentDomain)
  creating.value = false
}

async function handleBatchCopy() {
  await clipboardStore.copyCookies(Array.from(selectedCookies.value), cookieStore.currentDomain)
  selectedCookies.value = new Set()
}

async function handleBatchDelete() {
  for (const c of selectedCookies.value) {
    const url = `https://${c.domain.replace(/^\./, '')}${c.path}`
    await cookieManager.removeCookie({ url, name: c.name })
  }
  await cookieStore.loadCookies(cookieStore.currentDomain)
  selectedCookies.value = new Set()
}

async function handleBatchExport() {
  const json = await storageService.exportCookies(Array.from(selectedCookies.value))
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cookies-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
```

- [ ] **Step 9: Commit**

```bash
git add src/devtools
git commit -m "feat: implement DevTools application with full management UI"
```

---

## Task 11: Final Build and Test

- [ ] **Step 1: Run all tests**

Run: `npm run test:run`

Expected: All tests pass

- [ ] **Step 2: Build the extension**

Run: `npm run build`

Expected: Build succeeds, `dist` folder created

- [ ] **Step 3: Test in Chrome**

1. Open Chrome and go to `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `dist` folder
4. Test Popup: Click extension icon, verify cookie operations work
5. Test DevTools: Open DevTools, find "Cookie Manager" tab, verify full functionality

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: final build and test verification"
```
