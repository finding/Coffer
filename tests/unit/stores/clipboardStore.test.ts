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
      store.activeIndex = 0
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