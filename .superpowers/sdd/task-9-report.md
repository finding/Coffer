# Task 9: Unit Tests Report

## Status: DONE

## Summary
Created unit tests for header rule service and store. All 45 tests pass.

## Files Created/Modified

### Created
- `tests/unit/services/headerRuleService.test.ts` - Tests for HeaderRuleService
- `tests/unit/stores/headerRuleStore.test.ts` - Tests for headerRuleStore

### Modified
- `tests/setup.ts` - Added `declarativeNetRequest` mock to the Chrome API mock

## Test Coverage

### headerRuleService.test.ts
Tests for `HeaderRuleService` class:

1. **convertToChromeRules**
   - Convert add request header rule
   - Convert remove response header rule
   - Convert modify request header rule
   - Assign correct priority based on order

2. **syncRulesToChrome**
   - Clear rules when profile is null
   - Not sync rules when profile is disabled
   - Sync enabled rules from profile
   - Filter out disabled rules

3. **clearAllRules**
   - Clear existing rules and reset counter

### headerRuleStore.test.ts
Tests for `useHeaderRuleStore` Pinia store:

1. Load profiles on init
2. Create a new profile
3. Add rule to profile
4. Delete rule from profile
5. Update rule in profile
6. Toggle rule enabled state
7. Set active profile
8. Delete profile
9. Update profile name
10. Reorder rules
11. Compute activeProfile correctly
12. Handle error on loadProfiles

## Test Results
```
Test Files  7 passed (7)
Tests       45 passed (45)
```

## Commit
```
541885f test: add unit tests for header rule service and store
```

## Notes
- Tests follow existing patterns from `cookieStore.test.ts` and `storageService.test.ts`
- Added `declarativeNetRequest` mock to global test setup for Chrome API compatibility
- Used `vi.mock` for mocking storage and service dependencies in store tests
