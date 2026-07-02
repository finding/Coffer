# Task 8: 新存储服务

**Context:** This task creates a new storage service that integrates migration and replaces the old headerRuleStorage. The storage key `headerProfiles` is preserved for backward compatibility.

**Files:**
- Create: `src/services/requestRewriteStorage.ts`

**Interfaces:**
- Consumes: `RequestRewriteProfile` from Task 1, `checkAndMigrate` from Task 2
- Produces: `RequestRewriteStorage` class with profile CRUD and active profile management

---

## Steps

- [ ] **Step 1: 创建新存储服务**

```typescript
// src/services/requestRewriteStorage.ts

import type { RequestRewriteProfile } from '@/types'
import { checkAndMigrate } from './dataMigration'

const PROFILES_KEY = 'headerProfiles' // 保持key不变，兼容迁移
const ACTIVE_PROFILE_KEY = 'activeHeaderProfileId'

const DEFAULT_PROFILE: RequestRewriteProfile = {
  id: 'default',
  name: 'Default',
  enabled: true,
  rules: []
}

export class RequestRewriteStorage {
  async init(): Promise<void> {
    await checkAndMigrate()
  }

  async getProfiles(): Promise<RequestRewriteProfile[]> {
    const result = await chrome.storage.local.get(PROFILES_KEY)
    const profiles = result[PROFILES_KEY]
    if (!profiles || !Array.isArray(profiles)) {
      return [DEFAULT_PROFILE]
    }
    return profiles
  }

  async saveProfiles(profiles: RequestRewriteProfile[]): Promise<void> {
    const data = JSON.parse(JSON.stringify(profiles))
    await chrome.storage.local.set({ [PROFILES_KEY]: data })
    console.log('[RequestRewriteStorage] saved', profiles.length, 'profiles')
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

  async getActiveProfile(): Promise<RequestRewriteProfile | null> {
    const profiles = await this.getProfiles()
    const activeId = await this.getActiveProfileId()
    return profiles.find(p => p.id === activeId) ?? null
  }
}

export const requestRewriteStorage = new RequestRewriteStorage()
```

- [ ] **Step 2: 提交**

```bash
git add src/services/requestRewriteStorage.ts
git commit -m "feat: add RequestRewrite storage service"
```

---

**Global Constraints:**
- 数据结构向后兼容，支持自动迁移旧数据
- 存储key `headerProfiles` 保持不变以兼容迁移
