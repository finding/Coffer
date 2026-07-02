# Task 15: Tab名称全局更新

**Context:** This task updates all "Headers" Tab names to "RequestRewrite" across Popup, Manager, and DevTools.

**Files:**
- Modify: `src/popup/App.vue`
- Modify: `src/manager/App.vue`
- Modify: `src/devtools/App.vue`
- Modify: `src/manager/components/TabNav.vue` (if applicable)
- Modify: `src/popup/components/StatusCard.vue` (if applicable)
- Modify: `src/popup/components/QuickActions.vue` (if applicable)

---

## Steps

- [ ] **Step 1: Update all occurrences of "Headers" in Tab context**

Search for "Headers" as a tab name/label and replace with "RequestRewrite":
- Tab labels displayed to users
- Tab values in code
- Computed properties referencing headers tab

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "refactor: rename Headers tab to RequestRewrite globally"
```

---

**Global Constraints:**
- Tab名称统一变更：Headers → RequestRewrite（Popup、Manager、DevTools）
