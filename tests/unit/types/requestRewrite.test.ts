// tests/unit/types/requestRewrite.test.ts
import { describe, it, expect } from 'vitest'
import type {
  RequestRewriteRule,
  HeaderRuleAction,
  BodyRewriteAction,
  RequestRewriteProfile,
  LegacyHeaderRule,
  LegacyHeaderProfile,
  HttpMethod,
  HeaderTarget,
  BodyRewriteMethod
} from '@/types/requestRewrite'

describe('RequestRewrite Types', () => {
  describe('HttpMethod', () => {
    it('should accept valid HTTP methods', () => {
      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'ALL']
      expect(methods).toHaveLength(8)
    })
  })

  describe('HeaderTarget', () => {
    it('should accept valid header targets', () => {
      const targets: HeaderTarget[] = ['request', 'response']
      expect(targets).toHaveLength(2)
    })
  })

  describe('BodyRewriteMethod', () => {
    it('should accept valid body rewrite methods', () => {
      const methods: BodyRewriteMethod[] = ['text', 'jsonPath', 'regex', 'script']
      expect(methods).toHaveLength(4)
    })
  })

  describe('HeaderRuleAction', () => {
    it('should create a valid add header action', () => {
      const action: HeaderRuleAction = {
        action: 'add',
        headerName: 'X-Custom-Header',
        headerValue: 'custom-value'
      }
      expect(action.action).toBe('add')
      expect(action.headerName).toBe('X-Custom-Header')
      expect(action.headerValue).toBe('custom-value')
    })

    it('should create a valid modify header action', () => {
      const action: HeaderRuleAction = {
        action: 'modify',
        headerName: 'Authorization',
        headerValue: 'Bearer token123'
      }
      expect(action.action).toBe('modify')
    })

    it('should create a valid remove header action', () => {
      const action: HeaderRuleAction = {
        action: 'remove',
        headerName: 'X-Remove-Header',
        headerValue: ''
      }
      expect(action.action).toBe('remove')
    })
  })

  describe('BodyRewriteAction', () => {
    it('should create a text replacement action', () => {
      const action: BodyRewriteAction = {
        method: 'text',
        find: 'old-value',
        replace: 'new-value'
      }
      expect(action.method).toBe('text')
      expect(action.find).toBe('old-value')
      expect(action.replace).toBe('new-value')
    })

    it('should create a jsonPath action', () => {
      const action: BodyRewriteAction = {
        method: 'jsonPath',
        path: '$.data.name',
        value: 'updated-name'
      }
      expect(action.method).toBe('jsonPath')
      expect(action.path).toBe('$.data.name')
      expect(action.value).toBe('updated-name')
    })

    it('should create a regex action', () => {
      const action: BodyRewriteAction = {
        method: 'regex',
        pattern: '\\d{4}',
        replacement: 'XXXX'
      }
      expect(action.method).toBe('regex')
      expect(action.pattern).toBe('\\d{4}')
      expect(action.replacement).toBe('XXXX')
    })

    it('should create a script action', () => {
      const action: BodyRewriteAction = {
        method: 'script',
        scriptBody: 'return body.replace(/old/g, "new")'
      }
      expect(action.method).toBe('script')
      expect(action.scriptBody).toBe('return body.replace(/old/g, "new")')
    })
  })

  describe('RequestRewriteRule', () => {
    it('should create a valid rule with header actions', () => {
      const rule: RequestRewriteRule = {
        id: 'rule-1',
        enabled: true,
        name: 'Add Custom Header',
        urlPattern: '*://api.example.com/*',
        methods: ['GET', 'POST'],
        target: 'request',
        headers: [
          { action: 'add', headerName: 'X-Custom', headerValue: 'value' }
        ],
        bodyRewrites: []
      }
      expect(rule.id).toBe('rule-1')
      expect(rule.enabled).toBe(true)
      expect(rule.headers).toHaveLength(1)
      expect(rule.bodyRewrites).toHaveLength(0)
    })

    it('should create a valid rule with body rewrites', () => {
      const rule: RequestRewriteRule = {
        id: 'rule-2',
        enabled: true,
        name: 'Rewrite Response Body',
        urlPattern: '*://api.example.com/*',
        methods: ['ALL'],
        target: 'response',
        headers: [],
        bodyRewrites: [
          { method: 'text', find: 'staging', replace: 'production' }
        ]
      }
      expect(rule.bodyRewrites).toHaveLength(1)
    })

    it('should create a rule with multiple header and body actions', () => {
      const rule: RequestRewriteRule = {
        id: 'rule-3',
        enabled: true,
        name: 'Complex Rule',
        urlPattern: '*://example.com/*',
        methods: ['GET', 'POST', 'PUT'],
        target: 'response',
        headers: [
          { action: 'add', headerName: 'X-Header-1', headerValue: 'value1' },
          { action: 'modify', headerName: 'X-Header-2', headerValue: 'value2' },
          { action: 'remove', headerName: 'X-Header-3', headerValue: '' }
        ],
        bodyRewrites: [
          { method: 'jsonPath', path: '$.status', value: 'success' },
          { method: 'text', find: 'error', replace: 'warning' }
        ]
      }
      expect(rule.headers).toHaveLength(3)
      expect(rule.bodyRewrites).toHaveLength(2)
    })
  })

  describe('RequestRewriteProfile', () => {
    it('should create a valid profile', () => {
      const profile: RequestRewriteProfile = {
        id: 'profile-1',
        name: 'Test Profile',
        enabled: true,
        rules: []
      }
      expect(profile.id).toBe('profile-1')
      expect(profile.name).toBe('Test Profile')
      expect(profile.enabled).toBe(true)
      expect(profile.rules).toHaveLength(0)
    })

    it('should create a profile with rules', () => {
      const profile: RequestRewriteProfile = {
        id: 'profile-2',
        name: 'API Profile',
        enabled: true,
        rules: [
          {
            id: 'rule-1',
            enabled: true,
            name: 'Rule 1',
            urlPattern: '*://api1.com/*',
            methods: ['ALL'],
            target: 'request',
            headers: [],
            bodyRewrites: []
          },
          {
            id: 'rule-2',
            enabled: false,
            name: 'Rule 2',
            urlPattern: '*://api2.com/*',
            methods: ['POST'],
            target: 'response',
            headers: [],
            bodyRewrites: []
          }
        ]
      }
      expect(profile.rules).toHaveLength(2)
      expect(profile.rules[1].enabled).toBe(false)
    })
  })

  describe('Legacy Types (for migration)', () => {
    it('should create a valid LegacyHeaderRule', () => {
      const legacyRule: LegacyHeaderRule = {
        id: 'legacy-1',
        enabled: true,
        name: 'Legacy Rule',
        urlPattern: '*://legacy.com/*',
        methods: ['GET'],
        action: 'add',
        headerName: 'X-Legacy',
        headerValue: 'legacy-value',
        target: 'request'
      }
      expect(legacyRule.action).toBe('add')
      expect(legacyRule.headerName).toBe('X-Legacy')
    })

    it('should create a valid LegacyHeaderProfile', () => {
      const legacyProfile: LegacyHeaderProfile = {
        id: 'legacy-profile-1',
        name: 'Legacy Profile',
        enabled: true,
        rules: [
          {
            id: 'legacy-1',
            enabled: true,
            name: 'Legacy Rule',
            urlPattern: '*://legacy.com/*',
            methods: ['GET'],
            action: 'add',
            headerName: 'X-Legacy',
            headerValue: 'value',
            target: 'request'
          }
        ]
      }
      expect(legacyProfile.rules).toHaveLength(1)
    })
  })
})
