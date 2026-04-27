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
