// src/services/dataMigration.ts

import type { LegacyHeaderRule, LegacyHeaderProfile, RequestRewriteRule, RequestRewriteProfile } from '@/types'

const STORAGE_VERSION_KEY = 'rewriteStorageVersion'
const CURRENT_VERSION = 2

/**
 * Migrate a single LegacyHeaderRule to RequestRewriteRule format
 */
export function migrateRule(old: LegacyHeaderRule): RequestRewriteRule {
  return {
    id: old.id,
    enabled: old.enabled,
    name: old.name,
    urlPattern: old.urlPattern,
    methods: old.methods,
    target: old.target,
    headers: [{
      action: old.action,
      headerName: old.headerName,
      headerValue: old.headerValue
    }],
    bodyRewrites: []
  }
}

/**
 * Migrate a LegacyHeaderProfile to RequestRewriteProfile format
 */
export function migrateProfile(old: LegacyHeaderProfile): RequestRewriteProfile {
  return {
    id: old.id,
    name: old.name,
    enabled: old.enabled,
    rules: old.rules.map(migrateRule)
  }
}

/**
 * Check storage version and perform migration if needed
 * @returns true if migration was performed, false otherwise
 */
export async function checkAndMigrate(): Promise<boolean> {
  const result = await chrome.storage.local.get([STORAGE_VERSION_KEY, 'headerProfiles'])
  const version = result[STORAGE_VERSION_KEY] || 1

  if (version >= CURRENT_VERSION) {
    return false // No migration needed
  }

  // No profiles to migrate
  if (!result.headerProfiles) {
    return false
  }

  console.log('[Migration] Starting migration from v' + version + ' to v' + CURRENT_VERSION)

  if (version < 2 && result.headerProfiles) {
    const oldProfiles = result.headerProfiles as LegacyHeaderProfile[]
    const newProfiles = oldProfiles.map(migrateProfile)

    await chrome.storage.local.set({
      headerProfiles: newProfiles,
      [STORAGE_VERSION_KEY]: CURRENT_VERSION
    })

    console.log('[Migration] Migrated', newProfiles.length, 'profiles to v2')
  }

  return true
}