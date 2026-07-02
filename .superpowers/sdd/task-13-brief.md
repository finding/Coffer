# Task 13: UI组件 - 规则编辑器改造

**Context:** This task renames HeadersManager.vue to RequestRewriteManager.vue and updates all imports.

**Files:**
- Rename: `src/manager/components/HeadersManager.vue` → `src/manager/components/RequestRewriteManager.vue`
- Modify: Import statements in App.vue files

---

## Steps

- [ ] **Step 1: 重命名组件文件**

```bash
mv src/manager/components/HeadersManager.vue src/manager/components/RequestRewriteManager.vue
```

- [ ] **Step 2: 更新导入**

Update imports in:
- `src/manager/App.vue`
- `src/devtools/App.vue` 
- `src/popup/App.vue` (if applicable)

Change:
```typescript
import HeadersManager from '@/manager/components/HeadersManager.vue'
```
To:
```typescript
import RequestRewriteManager from '@/manager/components/RequestRewriteManager.vue'
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "refactor: rename HeadersManager to RequestRewriteManager"
```

---

**Global Constraints:**
- Tab名称统一变更：Headers → RequestRewrite
