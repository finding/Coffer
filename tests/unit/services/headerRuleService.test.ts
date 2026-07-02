// tests/unit/headerRuleService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HeaderRuleService } from '@/services/headerRuleService'
import type { HeaderRule, HeaderProfile } from '@/types'

describe('HeaderRuleService', () => {
  let service: HeaderRuleService

  beforeEach(() => {
    service = new HeaderRuleService()
    vi.clearAllMocks()
  })

  describe('convertToChromeRules', () => {
    it('should convert a simple add request header rule', () => {
      const rule: HeaderRule = {
        id: 'rule-1',
        enabled: true,
        name: 'Add Auth',
        urlPattern: '*://api.example.com/*',
        methods: ['GET', 'POST'],
        action: 'add',
        headerName: 'Authorization',
        headerValue: 'Bearer token123',
        target: 'request'
      }

      const chromeRules = service.convertToChromeRules([rule])

      expect(chromeRules).toHaveLength(1)
      expect(chromeRules[0].action.type).toBe('modifyHeaders')
      expect(chromeRules[0].action.requestHeaders).toHaveLength(1)
      expect(chromeRules[0].action.requestHeaders?.[0].header).toBe('Authorization')
      expect(chromeRules[0].action.requestHeaders?.[0].operation).toBe('set')
      expect(chromeRules[0].condition.urlFilter).toBe('*://api.example.com/*')
    })

    it('should convert a remove response header rule', () => {
      const rule: HeaderRule = {
        id: 'rule-2',
        enabled: true,
        name: 'Remove CSP',
        urlPattern: '*://*/*',
        methods: ['ALL'],
        action: 'remove',
        headerName: 'Content-Security-Policy',
        headerValue: '',
        target: 'response'
      }

      const chromeRules = service.convertToChromeRules([rule])

      expect(chromeRules).toHaveLength(1)
      expect(chromeRules[0].action.type).toBe('removeHeaders')
      expect(chromeRules[0].action.responseHeaders).toHaveLength(1)
      expect(chromeRules[0].action.responseHeaders?.[0].header).toBe('Content-Security-Policy')
      expect(chromeRules[0].condition.requestMethods).toBeUndefined()
    })

    it('should convert a modify request header rule', () => {
      const rule: HeaderRule = {
        id: 'rule-3',
        enabled: true,
        name: 'Modify Origin',
        urlPattern: '*://example.com/*',
        methods: ['ALL'],
        action: 'modify',
        headerName: 'Origin',
        headerValue: 'https://modified.com',
        target: 'request'
      }

      const chromeRules = service.convertToChromeRules([rule])

      expect(chromeRules).toHaveLength(1)
      expect(chromeRules[0].action.type).toBe('modifyHeaders')
      expect(chromeRules[0].action.requestHeaders?.[0].operation).toBe('set')
      expect(chromeRules[0].action.requestHeaders?.[0].value).toBe('https://modified.com')
    })

    it('should assign correct priority based on order', () => {
      const rules: HeaderRule[] = [
        { id: 'rule-1', enabled: true, name: 'Rule 1', urlPattern: '*://a.com/*', methods: ['ALL'], action: 'add', headerName: 'X-A', headerValue: 'a', target: 'request' },
        { id: 'rule-2', enabled: true, name: 'Rule 2', urlPattern: '*://b.com/*', methods: ['ALL'], action: 'add', headerName: 'X-B', headerValue: 'b', target: 'request' },
        { id: 'rule-3', enabled: true, name: 'Rule 3', urlPattern: '*://c.com/*', methods: ['ALL'], action: 'add', headerName: 'X-C', headerValue: 'c', target: 'request' }
      ]

      const chromeRules = service.convertToChromeRules(rules)

      expect(chromeRules[0].priority).toBe(1000)
      expect(chromeRules[1].priority).toBe(999)
      expect(chromeRules[2].priority).toBe(998)
    })
  })

  describe('syncRulesToChrome', () => {
    it('should clear rules when profile is null', async () => {
      // Mock existing rules to be cleared
      vi.mocked(chrome.declarativeNetRequest.getDynamicRules).mockResolvedValue([
        { id: 1, priority: 1, action: { type: 'modifyHeaders' }, condition: { urlFilter: '*' } }
      ])

      await service.syncRulesToChrome(null)

      expect(chrome.declarativeNetRequest.getDynamicRules).toHaveBeenCalled()
      expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [1]
      })
    })

    it('should not sync rules when profile is disabled', async () => {
      const profile: HeaderProfile = {
        id: 'profile-1',
        name: 'Test',
        enabled: false,
        rules: [
          {
            id: 'rule-1',
            enabled: true,
            name: 'Test Rule',
            urlPattern: '*://*/*',
            methods: ['ALL'],
            action: 'add',
            headerName: 'X-Test',
            headerValue: 'test',
            target: 'request'
          }
        ]
      }

      // Mock existing rules
      vi.mocked(chrome.declarativeNetRequest.getDynamicRules).mockResolvedValue([
        { id: 1, priority: 1, action: { type: 'modifyHeaders' }, condition: { urlFilter: '*' } }
      ])

      await service.syncRulesToChrome(profile)

      // Should only be called once for clearing rules, not for adding
      expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledTimes(1)
      expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [1]
      })
    })

    it('should sync enabled rules from profile', async () => {
      const profile: HeaderProfile = {
        id: 'profile-1',
        name: 'Test',
        enabled: true,
        rules: [
          {
            id: 'rule-1',
            enabled: true,
            name: 'Test Rule',
            urlPattern: '*://*/*',
            methods: ['ALL'],
            action: 'add',
            headerName: 'X-Test',
            headerValue: 'test',
            target: 'request'
          }
        ]
      }

      await service.syncRulesToChrome(profile)

      expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled()
    })

    it('should filter out disabled rules', async () => {
      const profile: HeaderProfile = {
        id: 'profile-1',
        name: 'Test',
        enabled: true,
        rules: [
          {
            id: 'rule-1',
            enabled: true,
            name: 'Enabled Rule',
            urlPattern: '*://*/*',
            methods: ['ALL'],
            action: 'add',
            headerName: 'X-Enabled',
            headerValue: 'enabled',
            target: 'request'
          },
          {
            id: 'rule-2',
            enabled: false,
            name: 'Disabled Rule',
            urlPattern: '*://*/*',
            methods: ['ALL'],
            action: 'add',
            headerName: 'X-Disabled',
            headerValue: 'disabled',
            target: 'request'
          }
        ]
      }

      await service.syncRulesToChrome(profile)

      // First call is for clearing rules, second is for adding
      const addCall = vi.mocked(chrome.declarativeNetRequest.updateDynamicRules).mock.calls.find(
        call => (call[0] as { addRules?: unknown[] }).addRules !== undefined
      )

      expect(addCall).toBeDefined()
      expect((addCall![0] as { addRules: unknown[] }).addRules).toHaveLength(1)
    })
  })

  describe('clearAllRules', () => {
    it('should clear existing rules and reset counter', async () => {
      vi.mocked(chrome.declarativeNetRequest.getDynamicRules).mockResolvedValue([
        { id: 1, priority: 1, action: { type: 'modifyHeaders' }, condition: { urlFilter: '*' } }
      ])

      await service.clearAllRules()

      expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [1]
      })
    })
  })
})
