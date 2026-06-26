// src/stores/requestRewriteStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RequestRewriteProfile, RequestRewriteRule } from '@/types'
import { requestRewriteStorage } from '@/services/requestRewriteStorage'
import { headerRuleService } from '@/services/headerRuleService'

export const useRequestRewriteStore = defineStore('requestRewrite', () => {
  const profiles = ref<RequestRewriteProfile[]>([])
  const activeProfileId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeProfile = computed(() =>
    profiles.value.find(p => p.id === activeProfileId.value) ?? null
  )

  /**
   * Notify content scripts that rules have been updated
   */
  async function notifyRulesUpdated(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ action: 'requestRewriteRulesUpdated' })
    } catch (e) {
      // Ignore - content script may not be listening
      console.log('[RequestRewriteStore] notifyRulesUpdated: no listener', e)
    }
  }

  /**
   * Load profiles from storage
   */
  async function loadProfiles(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await requestRewriteStorage.init()
      profiles.value = await requestRewriteStorage.getProfiles()
      activeProfileId.value = await requestRewriteStorage.getActiveProfileId()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load profiles'
      console.error('[RequestRewriteStore] loadProfiles error:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Save profiles to storage
   */
  async function saveProfiles(): Promise<void> {
    await requestRewriteStorage.saveProfiles(profiles.value)
  }

  /**
   * Set the active profile and sync rules to Chrome
   */
  async function setActiveProfile(profileId: string | null): Promise<void> {
    activeProfileId.value = profileId
    await requestRewriteStorage.setActiveProfileId(profileId)

    const profile = profiles.value.find(p => p.id === profileId) ?? null
    await headerRuleService.syncRulesToChrome(profile)
    await notifyRulesUpdated()
  }

  /**
   * Create a new profile
   */
  async function createProfile(name: string): Promise<RequestRewriteProfile> {
    const profile: RequestRewriteProfile = {
      id: `profile-${Date.now()}`,
      name,
      enabled: true,
      rules: []
    }
    profiles.value.push(profile)
    await saveProfiles()
    return profile
  }

  /**
   * Update an existing profile
   */
  async function updateProfile(profileId: string, updates: Partial<RequestRewriteProfile>): Promise<void> {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index !== -1) {
      profiles.value[index] = { ...profiles.value[index], ...updates }
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profiles.value[index])
        await notifyRulesUpdated()
      }
    }
  }

  /**
   * Delete a profile
   */
  async function deleteProfile(profileId: string): Promise<void> {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index !== -1) {
      profiles.value.splice(index, 1)
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await setActiveProfile(null)
      }
    }
  }

  /**
   * Add a rule to a profile
   */
  async function addRule(profileId: string, rule: RequestRewriteRule): Promise<void> {
    console.log('[RequestRewriteStore] addRule', profileId, rule.name)
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules.push(rule)
      await saveProfiles()
      console.log('[RequestRewriteStore] saved profiles:', profiles.value.length, 'total rules:', profile.rules.length)

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
        await notifyRulesUpdated()
      }
    } else {
      console.error('[RequestRewriteStore] profile not found:', profileId)
    }
  }

  /**
   * Update a rule in a profile
   */
  async function updateRule(profileId: string, ruleId: string, updates: Partial<RequestRewriteRule>): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const index = profile.rules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        profile.rules[index] = { ...profile.rules[index], ...updates }
        await saveProfiles()

        if (activeProfileId.value === profileId) {
          await headerRuleService.syncRulesToChrome(profile)
          await notifyRulesUpdated()
        }
      }
    }
  }

  /**
   * Delete a rule from a profile
   */
  async function deleteRule(profileId: string, ruleId: string): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules = profile.rules.filter(r => r.id !== ruleId)
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
        await notifyRulesUpdated()
      }
    }
  }

  /**
   * Reorder rules within a profile
   */
  async function reorderRules(profileId: string, ruleIds: string[]): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const reorderedRules: RequestRewriteRule[] = []
      for (const id of ruleIds) {
        const rule = profile.rules.find(r => r.id === id)
        if (rule) reorderedRules.push(rule)
      }
      profile.rules = reorderedRules
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
        await notifyRulesUpdated()
      }
    }
  }

  return {
    // State
    profiles,
    activeProfileId,
    activeProfile,
    loading,
    error,

    // Profile CRUD
    loadProfiles,
    saveProfiles,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,

    // Rule CRUD
    addRule,
    updateRule,
    deleteRule,
    reorderRules,

    // Notifications
    notifyRulesUpdated
  }
})

/**
 * Backward-compatible alias for existing code
 * @deprecated Use useRequestRewriteStore instead
 */
export const useHeaderRuleStore = useRequestRewriteStore
