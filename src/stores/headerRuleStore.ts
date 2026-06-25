// src/stores/headerRuleStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HeaderProfile, HeaderRule } from '@/types'
import { headerRuleStorage } from '@/services/headerRuleStorage'
import { headerRuleService } from '@/services/headerRuleService'

export const useHeaderRuleStore = defineStore('headerRules', () => {
  const profiles = ref<HeaderProfile[]>([])
  const activeProfileId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeProfile = computed(() =>
    profiles.value.find(p => p.id === activeProfileId.value) ?? null
  )

  async function loadProfiles(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      profiles.value = await headerRuleStorage.getProfiles()
      activeProfileId.value = await headerRuleStorage.getActiveProfileId()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load profiles'
    } finally {
      loading.value = false
    }
  }

  async function saveProfiles(): Promise<void> {
    await headerRuleStorage.saveProfiles(profiles.value)
  }

  async function setActiveProfile(profileId: string | null): Promise<void> {
    activeProfileId.value = profileId
    await headerRuleStorage.setActiveProfileId(profileId)

    const profile = profiles.value.find(p => p.id === profileId) ?? null
    await headerRuleService.syncRulesToChrome(profile)
  }

  async function createProfile(name: string): Promise<HeaderProfile> {
    const profile: HeaderProfile = {
      id: `profile-${Date.now()}`,
      name,
      enabled: true,
      rules: []
    }
    profiles.value.push(profile)
    await saveProfiles()
    return profile
  }

  async function updateProfile(profileId: string, updates: Partial<HeaderProfile>): Promise<void> {
    const index = profiles.value.findIndex(p => p.id === profileId)
    if (index !== -1) {
      profiles.value[index] = { ...profiles.value[index], ...updates }
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profiles.value[index])
      }
    }
  }

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

  async function addRule(profileId: string, rule: HeaderRule): Promise<void> {
    console.log('[HeaderStore] addRule', profileId, rule.name)
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules.push(rule)
      await saveProfiles()
      console.log('[HeaderStore] saved profiles:', profiles.value.length, 'total rules:', profile.rules.length)
      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
      }
    } else {
      console.error('[HeaderStore] profile not found:', profileId)
    }
  }

  async function updateRule(profileId: string, ruleId: string, updates: Partial<HeaderRule>): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const index = profile.rules.findIndex(r => r.id === ruleId)
      if (index !== -1) {
        profile.rules[index] = { ...profile.rules[index], ...updates }
        await saveProfiles()

        if (activeProfileId.value === profileId) {
          await headerRuleService.syncRulesToChrome(profile)
        }
      }
    }
  }

  async function deleteRule(profileId: string, ruleId: string): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      profile.rules = profile.rules.filter(r => r.id !== ruleId)
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
      }
    }
  }

  async function reorderRules(profileId: string, ruleIds: string[]): Promise<void> {
    const profile = profiles.value.find(p => p.id === profileId)
    if (profile) {
      const reorderedRules: HeaderRule[] = []
      for (const id of ruleIds) {
        const rule = profile.rules.find(r => r.id === id)
        if (rule) reorderedRules.push(rule)
      }
      profile.rules = reorderedRules
      await saveProfiles()

      if (activeProfileId.value === profileId) {
        await headerRuleService.syncRulesToChrome(profile)
      }
    }
  }

  return {
    profiles,
    activeProfileId,
    activeProfile,
    loading,
    error,
    loadProfiles,
    saveProfiles,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    addRule,
    updateRule,
    deleteRule,
    reorderRules
  }
})