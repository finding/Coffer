// tests/unit/headerRuleStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHeaderRuleStore } from '@/stores/requestRewriteStore'
import type { RequestRewriteRule } from '@/types'

// Mock storage
vi.mock('@/services/requestRewriteStorage', () => ({
  requestRewriteStorage: {
    init: vi.fn().mockResolvedValue(undefined),
    getProfiles: vi.fn().mockResolvedValue([
      { id: 'default', name: 'Default', enabled: true, rules: [] }
    ]),
    saveProfiles: vi.fn().mockResolvedValue(undefined),
    getActiveProfileId: vi.fn().mockResolvedValue('default'),
    setActiveProfileId: vi.fn().mockResolvedValue(undefined)
  }
}))

// Mock service
vi.mock('@/services/headerRuleService', () => ({
  headerRuleService: {
    syncRulesToChrome: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('headerRuleStore', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()

    // Reset store state before each test
    const store = useHeaderRuleStore()
    store.$patch({
      profiles: [],
      activeProfileId: null,
      loading: false,
      error: null
    })
  })

  it('should load profiles on init', async () => {
    const store = useHeaderRuleStore()

    await store.loadProfiles()

    expect(store.profiles).toHaveLength(1)
    expect(store.profiles[0].name).toBe('Default')
  })

  it('should create a new profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    const profile = await store.createProfile('New Profile')

    expect(profile.name).toBe('New Profile')
    expect(store.profiles).toHaveLength(2)
  })

  it('should add rule to profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    await store.addRule('default', {
      id: 'rule-1',
      enabled: true,
      name: 'Test Rule',
      urlPattern: '*://*/*',
      methods: ['ALL'],
      target: 'request',
      headers: [{ action: 'add', headerName: 'X-Test', headerValue: 'test' }],
      bodyRewrites: []
    })

    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.rules).toHaveLength(1)
  })

  it('should delete rule from profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    await store.addRule('default', {
      id: 'rule-1',
      enabled: true,
      name: 'Test Rule',
      urlPattern: '*://*/*',
      methods: ['ALL'],
      target: 'request',
      headers: [{ action: 'add', headerName: 'X-Test', headerValue: 'test' }],
      bodyRewrites: []
    })

    await store.deleteRule('default', 'rule-1')

    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.rules).toHaveLength(0)
  })

  it('should update rule in profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    await store.addRule('default', {
      id: 'rule-1',
      enabled: true,
      name: 'Test Rule',
      urlPattern: '*://*/*',
      methods: ['ALL'],
      target: 'request',
      headers: [{ action: 'add', headerName: 'X-Test', headerValue: 'test' }],
      bodyRewrites: []
    })
    await store.updateRule('default', 'rule-1', { name: 'Updated Rule' })

    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.rules[0].name).toBe('Updated Rule')
  })

  it('should toggle rule enabled state', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    await store.addRule('default', {
      id: 'rule-1',
      enabled: true,
      name: 'Test Rule',
      urlPattern: '*://*/*',
      methods: ['ALL'],
      target: 'request',
      headers: [{ action: 'add', headerName: 'X-Test', headerValue: 'test' }],
      bodyRewrites: []
    })
    await store.updateRule('default', 'rule-1', { enabled: false })

    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.rules[0].enabled).toBe(false)
  })

  it('should set active profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    await store.createProfile('New Profile')
    await store.setActiveProfile('default')

    expect(store.activeProfileId).toBe('default')
  })

  it('should delete profile', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    const profile = await store.createProfile('To Delete')
    const initialCount = store.profiles.length

    await store.deleteProfile(profile.id)

    expect(store.profiles.length).toBe(initialCount - 1)
    expect(store.profiles.find(p => p.id === profile.id)).toBeUndefined()
  })

  it('should update profile name', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    await store.updateProfile('default', { name: 'Updated Default' })

    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.name).toBe('Updated Default')
  })

  it('should reorder rules', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    await store.addRule('default', {
      id: 'rule-1', enabled: true, name: 'Rule 1', urlPattern: '*://a.com/*', methods: ['ALL'], target: 'request',
      headers: [{ action: 'add', headerName: 'X-A', headerValue: 'a' }], bodyRewrites: []
    })
    await store.addRule('default', {
      id: 'rule-2', enabled: true, name: 'Rule 2', urlPattern: '*://b.com/*', methods: ['ALL'], target: 'request',
      headers: [{ action: 'add', headerName: 'X-B', headerValue: 'b' }], bodyRewrites: []
    })
    await store.addRule('default', {
      id: 'rule-3', enabled: true, name: 'Rule 3', urlPattern: '*://c.com/*', methods: ['ALL'], target: 'request',
      headers: [{ action: 'add', headerName: 'X-C', headerValue: 'c' }], bodyRewrites: []
    })

    // Reorder: 3, 1, 2
    await store.reorderRules('default', ['rule-3', 'rule-1', 'rule-2'])

    const profile = store.profiles.find(p => p.id === 'default')
    expect(profile?.rules[0].id).toBe('rule-3')
    expect(profile?.rules[1].id).toBe('rule-1')
    expect(profile?.rules[2].id).toBe('rule-2')
  })

  it('should compute activeProfile correctly', async () => {
    const store = useHeaderRuleStore()
    await store.loadProfiles()

    // Default profile is active
    expect(store.activeProfile?.id).toBe('default')

    // Set to null
    await store.setActiveProfile(null)
    expect(store.activeProfile).toBeNull()
  })

  it('should handle error on loadProfiles', async () => {
    const { requestRewriteStorage } = await import('@/services/requestRewriteStorage')
    vi.mocked(requestRewriteStorage.getProfiles).mockRejectedValueOnce(new Error('Storage error'))

    const store = useHeaderRuleStore()
    await store.loadProfiles()

    expect(store.error).toBe('Storage error')
    expect(store.loading).toBe(false)
  })
})
