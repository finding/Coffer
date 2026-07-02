# Task 15 Report: Tab名称全局更新

## Files Modified

1. `src/popup/App.vue` - Line 20
2. `src/devtools/App.vue` - Line 16
3. `src/manager/components/TabNav.vue` - Line 32

## Changes Made

Updated all "Headers" tab display labels to "RequestRewrite":

| File | Location | Change |
|------|----------|--------|
| `src/popup/App.vue` | Tab button label | `'Headers'` → `'RequestRewrite'` |
| `src/devtools/App.vue` | Panel switch button | `Headers` → `RequestRewrite` |
| `src/manager/components/TabNav.vue` | Tab label | `label: 'Headers'` → `label: 'RequestRewrite'` |

**Note:** Internal values (like `activeTab === 'headers'`, type definitions) remain as `'headers'` for backward compatibility with existing code.

## Build Verification

```
✓ 80 modules transformed
✓ built in 1.05s
```

Build passed successfully.

## Commit

```
99de38d refactor: rename Headers tab to RequestRewrite globally
```

## Concerns

None. All changes are straightforward display label updates.

## Status

DONE