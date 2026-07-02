# Task 1 Report: 类型定义扩展 (RequestRewrite)

## Status: DONE

## Files Created/Modified

### Created
- `/Users/ken/Desktop/AI/src/types/requestRewrite.ts`
  - Defined `BodyRewriteMethod` type union: 'text' | 'jsonPath' | 'regex' | 'script'
  - Defined `HeaderRuleAction` interface for single header modification action
  - Defined `BodyRewriteAction` interface for body rewrite operations
  - Defined `RequestRewriteRule` interface (supports multiple headers and body rewrites)
  - Defined `RequestRewriteProfile` interface
  - Defined `LegacyHeaderRule` interface for migration
  - Defined `LegacyHeaderProfile` interface for migration
  - Defined `RequestRewriteProfilesExport` interface

- `/Users/ken/Desktop/AI/src/types/variable.ts`
  - Defined `PresetVariable` interface (static user-defined variables)
  - Defined `AutoExtractVariable` interface (dynamic from localStorage/sessionStorage/cookie/meta)
  - Defined `Variable` union type

- `/Users/ken/Desktop/AI/tests/unit/types/requestRewrite.test.ts`
  - 17 tests covering all RequestRewrite types

- `/Users/ken/Desktop/AI/tests/unit/types/variable.test.ts`
  - 9 tests covering all Variable types

### Modified
- `/Users/ken/Desktop/AI/src/types/index.ts`
  - Added `export * from './requestRewrite'`
  - Added `export * from './variable'`

## Types Exported
From `requestRewrite.ts`:
- `HttpMethod` (re-exported from headerRule)
- `HeaderTarget` (re-exported from headerRule)
- `BodyRewriteMethod`
- `HeaderRuleAction`
- `BodyRewriteAction`
- `RequestRewriteRule`
- `RequestRewriteProfile`
- `LegacyHeaderRule`
- `LegacyHeaderProfile`
- `RequestRewriteProfilesExport`

From `variable.ts`:
- `PresetVariable`
- `AutoExtractVariable`
- `Variable`

## Tests Run
```
npm test -- tests/unit/types/ --run
 ✓ tests/unit/types/variable.test.ts  (9 tests)
 ✓ tests/unit/types/requestRewrite.test.ts  (17 tests)

 Test Files  2 passed (2)
      Tests  26 passed (26)
```

## Build Verification
```
npm run build
✓ built in 915ms
```

## Commit
- SHA: `aed8feb`
- Message: `feat: add RequestRewrite and Variable type definitions`

## Notes
- Type naming: Used `HeaderRuleAction` instead of `HeaderAction` to avoid conflict with existing `HeaderAction` type in `headerRule.ts` (which is a string union for action types)
- Reused `HttpMethod` and `HeaderTarget` from existing `headerRule.ts` to maintain consistency
- Added `LegacyHeaderRule` and `LegacyHeaderProfile` interfaces to support data migration from old format

## Concerns
None. All types compile correctly, tests pass, and build succeeds.