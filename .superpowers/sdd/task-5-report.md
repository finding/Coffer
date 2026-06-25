# Task 5 Report: Background Service Worker Update

## Status: DONE

## Summary
Successfully updated `src/background/index.ts` to handle header rule messages.

## Changes Made

### 1. Added Imports
```typescript
import { headerRuleStorage } from '@/services/headerRuleStorage'
import { headerRuleService } from '@/services/headerRuleService'
import type { HeaderProfile } from '@/types'
```

### 2. Updated onInstalled Listener
Added initialization of header rules on extension install:
```typescript
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Coffer installed')
  await headerRuleService.initialize()
})
```

### 3. Added Message Handlers
Added 5 new message handlers in `handleMessage`:

| Action | Description |
|--------|-------------|
| `getHeaderProfiles` | Returns all header profiles from storage |
| `setHeaderProfiles` | Saves profiles to storage |
| `syncHeaderRules` | Syncs a profile's rules to Chrome's declarativeNetRequest API |
| `exportHeaderProfiles` | Returns JSON string of profiles for export |
| `importHeaderProfiles` | Parses and saves imported profiles |

## Build Verification
- Build succeeded with no TypeScript errors
- All imports resolved correctly
- Background worker compiles to 6.26 kB (gzip: 2.01 kB)

## Commit
```
0b04821 feat: add header rule handling to background worker
```

## Files Modified
- `src/background/index.ts` - Added header rule message handling