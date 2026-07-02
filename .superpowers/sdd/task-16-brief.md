# Task 16: 集成测试和构建

**Context:** This task verifies that all content script entry is properly configured and runs full build and test suite.

**Files:**
- Verify: `vite.config.ts` has content entry
- Build: All entries compile successfully
- Test: All tests pass

---

## Steps

- [ ] **Step 1: Verify vite.config.ts content entry**

Check that `src/content/index.ts` is included as an input entry.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: All entries (popup, devtools, manager, background, content) compile successfully

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: 提交**

If any fixes needed, commit them.

---

**Global Constraints:**
- Content Script必须正确构建
- 所有测试必须通过
