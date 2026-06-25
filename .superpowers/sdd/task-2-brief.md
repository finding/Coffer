# Task 2: Header 规则存储服务

**Goal:** Create storage service for managing header profiles in chrome.storage.local.

## Files to Create

- Create: `src/services/headerRuleStorage.ts`

## Implementation

```typescript
// src/services/headerRuleStorage.ts

import type { HeaderProfile } from '@/types'

const PROFILES_KEY = 'headerProfiles'
const ACTIVE_PROFILE_KEY = 'activeHeaderProfileId'

const DEFAULT_PROFILE: HeaderProfile = {
  id: 'default',
  name: 'Default',
  enabled: true,
  rules: []
}

export class HeaderRuleStorage {
  async getProfiles(): Promise<HeaderProfile[]> {
    const result = await chrome.storage.local.get(PROFILES_KEY)
    return result[PROFILES_KEY] ?? [DEFAULT_PROFILE]
  }

  async saveProfiles(profiles: HeaderProfile[]): Promise<void> {
    await chrome.storage.local.set({ [PROFILES_KEY]: profiles })
  }

  async getActiveProfileId(): Promise<string | null> {
    const result = await chrome.storage.local.get(ACTIVE_PROFILE_KEY)
    return result[ACTIVE_PROFILE_KEY] ?? null
  }

  async setActiveProfileId(profileId: string | null): Promise<void> {
    if (profileId) {
      await chrome.storage.local.set({ [ACTIVE_PROFILE_KEY]: profileId })
    } else {
      await chrome.storage.local.remove(ACTIVE_PROFILE_KEY)
    }
  }

  async getActiveProfile(): Promise<HeaderProfile | null> {
    const profiles = await this.getProfiles()
    const activeId = await this.getActiveProfileId()
    return profiles.find(p => p.id === activeId) ?? null
  }
}

export const headerRuleStorage = new HeaderRuleStorage()
```

## Commit

```bash
git add src/services/headerRuleStorage.ts
git commit -m "feat: add header rule storage service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```