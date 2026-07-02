# Task 17: 最终验证和清理

**Context:** This is the final task. Clean up deprecated files and ensure all imports use new types and stores.

**Files to potentially delete:**
- `src/services/headerRuleStorage.ts` (replaced by requestRewriteStorage)
- `src/stores/headerRuleStore.ts` (replaced by requestRewriteStore)
- `src/types/headerRule.ts` (replaced by requestRewrite)

**Import updates needed:**
- All files should use new types from `@/types/requestRewrite`
- All files should use `useRequestRewriteStore` (or `useHeaderRuleStore` alias)

---

## Steps

- [ ] **Step 1: Check if deprecated files can be deleted**

Search for any remaining imports from deprecated files.

- [ ] **Step 2: Update remaining imports**

Ensure all files use new modules.

- [ ] **Step 3: Final build and test**

Run: `npm run build && npm test`
Expected: All pass

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: cleanup deprecated files and finalize RequestRewrite feature"
```

---

**Global Constraints:**
- 数据结构向后兼容
- 确保所有导入更新
