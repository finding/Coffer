// tests/unit/types/variable.test.ts
import { describe, it, expect } from 'vitest'
import type {
  PresetVariable,
  AutoExtractVariable,
  Variable
} from '@/types/variable'

describe('Variable Types', () => {
  describe('PresetVariable', () => {
    it('should create a preset variable with required fields', () => {
      const variable: PresetVariable = {
        name: 'apiToken',
        value: 'bearer-token-123'
      }
      expect(variable.name).toBe('apiToken')
      expect(variable.value).toBe('bearer-token-123')
      expect(variable.description).toBeUndefined()
    })

    it('should create a preset variable with description', () => {
      const variable: PresetVariable = {
        name: 'apiKey',
        value: 'sk-12345',
        description: 'API Key for external service'
      }
      expect(variable.description).toBe('API Key for external service')
    })
  })

  describe('AutoExtractVariable', () => {
    it('should create a localStorage auto-extract variable', () => {
      const variable: AutoExtractVariable = {
        name: 'sessionId',
        source: 'localStorage',
        key: 'session_id'
      }
      expect(variable.name).toBe('sessionId')
      expect(variable.source).toBe('localStorage')
      expect(variable.key).toBe('session_id')
    })

    it('should create a sessionStorage auto-extract variable', () => {
      const variable: AutoExtractVariable = {
        name: 'tempToken',
        source: 'sessionStorage',
        key: 'temp_token'
      }
      expect(variable.source).toBe('sessionStorage')
    })

    it('should create a cookie auto-extract variable', () => {
      const variable: AutoExtractVariable = {
        name: 'authCookie',
        source: 'cookie',
        key: 'auth_token'
      }
      expect(variable.source).toBe('cookie')
    })

    it('should create a meta auto-extract variable', () => {
      const variable: AutoExtractVariable = {
        name: 'csrfToken',
        source: 'meta',
        key: 'csrf-token'
      }
      expect(variable.source).toBe('meta')
    })
  })

  describe('Variable union type', () => {
    it('should accept a PresetVariable as Variable', () => {
      const variable: Variable = {
        name: 'presetVar',
        value: 'preset-value'
      }
      expect(variable.name).toBe('presetVar')
    })

    it('should accept an AutoExtractVariable as Variable', () => {
      const variable: Variable = {
        name: 'autoVar',
        source: 'localStorage',
        key: 'auto_key'
      }
      expect(variable.name).toBe('autoVar')
    })

    it('should differentiate between variable types', () => {
      const preset: Variable = { name: 'p', value: 'v' }
      const auto: Variable = { name: 'a', source: 'cookie', key: 'k' }

      // Type guard to check if it's a PresetVariable
      const isPreset = (v: Variable): v is PresetVariable => 'value' in v
      const isAuto = (v: Variable): v is AutoExtractVariable => 'source' in v

      expect(isPreset(preset)).toBe(true)
      expect(isAuto(preset)).toBe(false)
      expect(isPreset(auto)).toBe(false)
      expect(isAuto(auto)).toBe(true)
    })
  })
})