# Task 2: 数据迁移服务

**Context:** This task creates a migration service to convert old HeaderRule data structures to the new RequestRewriteRule format. The migration runs on extension startup if needed.

**Files:**
- Create: `src/services/dataMigration.ts`
- Create: `tests/unit/services/dataMigration.test.ts`

**Interfaces:**
- Consumes: `LegacyHeaderRule`, `LegacyHeaderProfile`, `RequestRewriteRule`, `RequestRewriteProfile` from Task 1
- Produces: `migrateRule()`, `migrateProfile()`, `checkAndMigrate()`

---

## Steps

- [ ] **Step 1: 创建数据迁移服务**

```typescript
// src/services/dataMigration.ts

import type { LegacyHeaderRule, LegacyHeaderProfile, RequestRewriteRule, RequestRewriteProfile } from '@/types'

const STORAGE_VERSION_KEY = 'rewriteStorageVersion'
const CURRENT_VERSION = 2

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

export function migrateProfile(old: LegacyHeaderProfile): RequestRewriteProfile {
  return {
    id: old.id,
    name: old.name,
    enabled: old.enabled,
    rules: old.rules.map(migrateRule)
  }
}

export async function checkAndMigrate(): Promise<boolean> {
  const result = await chrome.storage.local.get([STORAGE_VERSION_KEY, 'headerProfiles'])
  const version = result[STORAGE_VERSION_KEY] || 1
  
  if (version >= CURRENT_VERSION) {
    return false // 无需迁移
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
```

- [ ] **Step 2: 添加迁移测试**

```typescript
// tests/unit/services/dataMigration.test.ts

import { describe, it, expect } from 'vitest'
import { migrateRule, migrateProfile } from '@/services/dataMigration'
import type { LegacyHeaderRule, LegacyHeaderProfile } from '@/types'

describe('dataMigration', () => {
  it('should migrate a single rule', () => {
    const oldRule: LegacyHeaderRule = {
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
    
    const newRule = migrateRule(oldRule)
    
    expect(newRule.id).toBe('rule-1')
    expect(newRule.headers).toHaveLength(1)
    expect(newRule.headers[0].headerName).toBe('Authorization')
    expect(newRule.bodyRewrites).toHaveLength(0)
  })
  
  it('should migrate a profile with multiple rules', () => {
    const oldProfile: LegacyHeaderProfile = {
      id: 'profile-1',
      name: 'Test Profile',
      enabled: true,
      rules: [
        {
          id: 'rule-1',
          enabled: true,
          name: 'Rule 1',
          urlPattern: '*://*/*',
          methods: ['ALL'],
          action: 'add',
          headerName: 'X-Custom',
          headerValue: 'value',
          target: 'request'
        }
      ]
    }
    
    const newProfile = migrateProfile(oldProfile)
    
    expect(newProfile.id).toBe('profile-1')
    expect(newProfile.rules).toHaveLength(1)
    expect(newProfile.rules[0].headers).toHaveLength(1)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `npm test tests/unit/services/dataMigration.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/services/dataMigration.ts tests/unit/services/dataMigration.test.ts
git commit -m "feat: add data migration service for RequestRewrite"
```

---

**Global Constraints:**
- 数据结构向后兼容，支持自动迁移旧数据
- 存储key `headerProfiles` 保持不变以兼容迁移
