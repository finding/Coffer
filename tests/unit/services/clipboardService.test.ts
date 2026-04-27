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