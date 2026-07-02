# Task 9 Report: Update Store

## Status: DONE

## Files Created

### `src/stores/requestRewriteStore.ts`
- New Pinia store replacing `headerRuleStore`
- Full CRUD for profiles and rules
- Notification to content scripts when rules change
- Backward-compatible alias `useHeaderRuleStore`

### `src/services/headerRuleService.ts` (Modified)
- Updated to support both old `HeaderProfile` and new `RequestRewriteProfile` formats
- Added `convertNewFormatToChromeRules()` for new format conversion
- Added `convertNewRuleToChromeRule()` for individual rule conversion

## Methods Exported

### State
- `profiles` - ref to array of RequestRewriteProfile
- `activeProfileId` - ref to current active profile ID
- `activeProfile` - computed active profile
- `loading` - loading state
- `error` - error state

### Profile CRUD
- `loadProfiles()` - load and initialize storage
- `saveProfiles()` - save to storage
- `setActiveProfile(profileId)` - switch active profile + sync + notify
- `createProfile(name)` - create new profile
- `updateProfile(profileId, updates)` - update profile
- `deleteProfile(profileId)` - delete profile

### Rule CRUD
- `addRule(profileId, rule)` - add rule to profile
- `updateRule(profileId, ruleId, updates)` - update rule
- `deleteRule(profileId, ruleId)` - delete rule
- `reorderRules(profileId, ruleIds)` - reorder rules

### Notifications
- `notifyRulesUpdated()` - send message to background/content scripts

## Build Verification

```
npm run build
```
- Build succeeded with no errors
- All TypeScript types correctly resolved

## Commits Made

1. `934e411` - feat: add RequestRewrite store with full CRUD operations

## Notes
- Updated `headerRuleService.ts` to support both old and new profile formats
- The service now automatically detects the format based on whether rules have `headers` array
- Backward compatibility maintained via `useHeaderRuleStore` alias