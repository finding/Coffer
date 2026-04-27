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
      store.filters.keyword = 'b'
      expect(store.filteredCookies).toHaveLength(1)
      expect(store.filteredCookies[0].name).toBe('b')
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