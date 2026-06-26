// tests/unit/content/bodyRewriter.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { rewriteBody, rewriteGetParams, setVariableMap, applyVariables } from '@/content/bodyRewriter'
import type { BodyRewriteAction } from '@/types'

describe('bodyRewriter', () => {
  beforeEach(() => {
    // Reset variable map before each test
    setVariableMap(new Map())
  })

  describe('applyVariables', () => {
    it('should resolve {{varName}} pattern', () => {
      setVariableMap(new Map([['myToken', 'secret123']]))
      expect(applyVariables('{{myToken}}')).toBe('secret123')
    })

    it('should resolve multiple variables in one string', () => {
      setVariableMap(new Map([['token', 'abc'], ['user', 'john']]))
      expect(applyVariables('{{token}}-{{user}}')).toBe('abc-john')
    })

    it('should return empty string for unresolved variables', () => {
      expect(applyVariables('{{unknown}}')).toBe('')
    })

    it('should preserve non-variable text', () => {
      setVariableMap(new Map([['name', 'test']]))
      expect(applyVariables('prefix-{{name}}-suffix')).toBe('prefix-test-suffix')
    })
  })

  describe('rewriteBody', () => {
    describe('text method', () => {
      it('should replace text', () => {
        const body = '{"status":0,"message":"error"}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', find: '"status":0', replace: '"status":1' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"status":1,"message":"error"}')
      })

      it('should replace all occurrences', () => {
        const body = 'aaa bbb aaa'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', find: 'aaa', replace: 'ccc' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('ccc bbb ccc')
      })

      it('should return original body if find is not provided', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', replace: '"status":1' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe(body)
      })

      it('should replace with empty string if replace is not provided', () => {
        const body = 'hello world'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', find: ' world' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('hello')
      })
    })

    describe('jsonPath method', () => {
      it('should modify jsonPath', () => {
        const body = '{"data":{"token":"old_token"}}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'data.token', value: 'new_token' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"data":{"token":"new_token"}}')
      })

      it('should create nested path if not exists', () => {
        const body = '{}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'data.nested.value', value: 'test' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"data":{"nested":{"value":"test"}}}')
      })

      it('should return original body if path is not provided', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', value: 'test' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe(body)
      })

      it('should return original body if value is not provided', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'status' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe(body)
      })

      it('should resolve variables in value', () => {
        setVariableMap(new Map([['myToken', 'secret123']]))
        const body = '{"token":"old"}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'token', value: '{{myToken}}' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"token":"secret123"}')
      })
    })

    describe('regex method', () => {
      it('should apply regex replacement', () => {
        const body = '{"token":"abc123","name":"test"}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'regex', pattern: '"token":"[^"]*"', replacement: '"token":"xyz789"' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"token":"xyz789","name":"test"}')
      })

      it('should replace all matches', () => {
        const body = 'aaa bbb aaa'
        const rewrites: BodyRewriteAction[] = [
          { method: 'regex', pattern: 'a+', replacement: 'x' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('x bbb x')
      })

      it('should return original body if pattern is not provided', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'regex', replacement: 'test' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe(body)
      })

      it('should use empty string as replacement if not provided', () => {
        const body = 'hello world'
        const rewrites: BodyRewriteAction[] = [
          { method: 'regex', pattern: ' world' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('hello')
      })
    })

    describe('script method', () => {
      it('should apply script transformation', () => {
        const body = '{"count":5}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'script', scriptBody: 'return JSON.stringify({ ...JSON.parse(body), count: JSON.parse(body).count * 2 })' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"count":10}')
      })

      it('should have access to url and method', () => {
        const body = '{}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'script', scriptBody: 'return JSON.stringify({ url, method })' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com/api', 'POST')
        expect(result).toBe('{"url":"https://api.test.com/api","method":"POST"}')
      })

      it('should return original body if scriptBody is not provided', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'script' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe(body)
      })
    })

    describe('multiple rewrites', () => {
      it('should apply multiple rewrites in sequence', () => {
        const body = '{"status":0,"data":{"value":"old"}}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', find: '"status":0', replace: '"status":1' },
          { method: 'jsonPath', path: 'data.value', value: 'new' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"status":1,"data":{"value":"new"}}')
      })

      it('should apply three rewrites in sequence', () => {
        const body = '{"a":1,"b":2,"c":3}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'a', value: '10' },
          { method: 'jsonPath', path: 'b', value: '20' },
          { method: 'jsonPath', path: 'c', value: '30' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"a":"10","b":"20","c":"30"}')
      })
    })

    describe('error handling', () => {
      it('should continue on error and return original body', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'data.nested', value: 'test' }, // Creates nested path
          { method: 'text', find: '"status":0', replace: '"status":1' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"status":1,"data":{"nested":"test"}}')
      })

      it('should continue on invalid JSON for jsonPath', () => {
        const body = 'not valid json'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'data', value: 'test' }, // Will fail
          { method: 'text', find: 'not valid', replace: 'valid' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('valid json')
      })

      it('should continue on invalid regex pattern', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'regex', pattern: '[invalid', replacement: 'test' }, // Invalid regex
          { method: 'text', find: '"status":0', replace: '"status":1' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"status":1}')
      })

      it('should continue on script error', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'script', scriptBody: 'throw new Error("test")' }, // Will fail
          { method: 'text', find: '"status":0', replace: '"status":1' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe('{"status":1}')
      })

      it('should return original body for unknown method', () => {
        const body = '{"status":0}'
        const rewrites: BodyRewriteAction[] = [
          { method: 'unknown' as any, find: 'test' }
        ]
        const result = rewriteBody(body, rewrites, 'https://api.test.com', 'POST')
        expect(result).toBe(body)
      })
    })

    describe('empty rewrites', () => {
      it('should return original body for empty rewrites', () => {
        const body = '{"status":0}'
        const result = rewriteBody(body, [], 'https://api.test.com', 'POST')
        expect(result).toBe(body)
      })
    })
  })

  describe('rewriteGetParams', () => {
    describe('text method', () => {
      it('should rewrite query params with text', () => {
        const url = 'https://api.test.com?page=1&size=10'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', find: 'page=1', replace: 'page=2' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=2&size=10')
      })
    })

    describe('regex method', () => {
      it('should rewrite query params with regex', () => {
        const url = 'https://api.test.com?page=1&size=10'
        const rewrites: BodyRewriteAction[] = [
          { method: 'regex', pattern: 'page=\\d+', replacement: 'page=99' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=99&size=10')
      })
    })

    describe('jsonPath method', () => {
      it('should rewrite specific query param', () => {
        const url = 'https://api.test.com?page=1&size=10'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'page', value: '5' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=5&size=10')
      })

      it('should not change URL if param does not exist', () => {
        const url = 'https://api.test.com?page=1'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'missing', value: 'test' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=1')
      })

      it('should resolve variables in value', () => {
        setVariableMap(new Map([['pageSize', '25']]))
        const url = 'https://api.test.com?size=10'
        const rewrites: BodyRewriteAction[] = [
          { method: 'jsonPath', path: 'size', value: '{{pageSize}}' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?size=25')
      })
    })

    describe('script method', () => {
      it('should modify params via script', () => {
        const url = 'https://api.test.com?page=1&size=10'
        const rewrites: BodyRewriteAction[] = [
          { method: 'script', scriptBody: 'params.set("page", "999");' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=999&size=10')
      })

      it('should have access to url in script', () => {
        const url = 'https://api.test.com?page=1'
        const rewrites: BodyRewriteAction[] = [
          { method: 'script', scriptBody: 'if (url.includes("test.com")) params.set("source", "test");' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=1&source=test')
      })
    })

    describe('no query string', () => {
      it('should return original URL if no query string', () => {
        const url = 'https://api.test.com/path'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', find: 'page=1', replace: 'page=2' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe(url)
      })
    })

    describe('error handling', () => {
      it('should continue on invalid regex', () => {
        const url = 'https://api.test.com?page=1&size=10'
        const rewrites: BodyRewriteAction[] = [
          { method: 'regex', pattern: '[invalid', replacement: 'test' }, // Invalid regex
          { method: 'text', find: 'page=1', replace: 'page=2' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=2&size=10')
      })

      it('should continue on script error', () => {
        const url = 'https://api.test.com?page=1&size=10'
        const rewrites: BodyRewriteAction[] = [
          { method: 'script', scriptBody: 'throw new Error("test")' }, // Will fail
          { method: 'text', find: 'page=1', replace: 'page=2' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=2&size=10')
      })
    })

    describe('multiple rewrites', () => {
      it('should apply multiple rewrites', () => {
        const url = 'https://api.test.com?page=1&size=10&sort=asc'
        const rewrites: BodyRewriteAction[] = [
          { method: 'text', find: 'page=1', replace: 'page=2' },
          { method: 'jsonPath', path: 'size', value: '20' },
          { method: 'regex', pattern: 'sort=\\w+', replacement: 'sort=desc' }
        ]
        const result = rewriteGetParams(url, rewrites)
        expect(result).toBe('https://api.test.com?page=2&size=20&sort=desc')
      })
    })

    describe('empty rewrites', () => {
      it('should return original URL for empty rewrites', () => {
        const url = 'https://api.test.com?page=1'
        const result = rewriteGetParams(url, [])
        expect(result).toBe(url)
      })
    })
  })
})