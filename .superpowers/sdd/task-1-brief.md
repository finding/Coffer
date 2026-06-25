# Task 1: 类型定义和权限配置

**Goal:** Create TypeScript type definitions for header modification feature and add required Chrome API permissions.

## Files to Create/Modify

- Create: `src/types/headerRule.ts`
- Modify: `src/types/index.ts`
- Modify: `manifest.json`

## Step 1: Create `src/types/headerRule.ts`

```typescript
// src/types/headerRule.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'

export type HeaderTarget = 'request' | 'response'

export type HeaderAction = 'add' | 'modify' | 'remove'

export interface HeaderRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  action: HeaderAction
  headerName: string
  headerValue: string
  target: HeaderTarget
}

export interface HeaderProfile {
  id: string
  name: string
  enabled: boolean
  rules: HeaderRule[]
}

export interface HeaderProfilesExport {
  version: string
  profiles: HeaderProfile[]
}
```

## Step 2: Update `src/types/index.ts`

Add at the end of the file:

```typescript
export * from './headerRule'
```

Also update the `MessagePayload` interface's `action` type to include:
```typescript
| 'getHeaderProfiles' | 'setHeaderProfiles' | 'syncHeaderRules' | 'exportHeaderProfiles' | 'importHeaderProfiles'
```

And add these fields to the interface:
```typescript
profiles?: HeaderProfile[]
profileId?: string
ruleId?: string
profileData?: HeaderProfile
jsonString?: string
```

## Step 3: Update `manifest.json`

Add these permissions to the `permissions` array:
```json
"declarativeNetRequest",
"declarativeNetRequestFeedback"
```

## Step 4: Commit

```bash
git add src/types/headerRule.ts src/types/index.ts manifest.json
git commit -m "feat: add header rule types and permissions

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
