# Task 12: UI组件 - Settings变量管理

**Context:** This task adds variable management UI to the DevTools SettingsPanel. Users can create/edit/delete preset variables and auto-extract variables.

**Files:**
- Modify: `src/devtools/components/SettingsPanel.vue`

**Interfaces:**
- Consumes: `useVariableStore` from Task 4
- Produces: Variable management UI with preset and auto-extract sections

---

## Key Features

1. **Preset Variables Section:**
   - List of existing preset variables with name, value
   - Edit and Delete buttons for each
   - Add Variable button
   - Modal for adding/editing (name, value inputs)

2. **Auto Extract Variables Section:**
   - List of auto-extract variables with name, source, key
   - Delete button for each
   - Add Auto Extract button
   - Modal with source dropdown (localStorage/sessionStorage/cookie), key input

---

## Steps

- [ ] **Step 1: Read existing SettingsPanel.vue** to understand structure

- [ ] **Step 2: Add variable management section**

Add a Variables section after existing settings:
- Use variableStore for state management
- Add modals for add/edit operations
- Style with Tailwind CSS matching existing UI

- [ ] **Step 3: 提交**

```bash
git add src/devtools/components/SettingsPanel.vue
git commit -m "feat: add variable management to SettingsPanel"
```

---

**Global Constraints:**
- UI使用Tailwind CSS，保持与现有风格一致
- 变量支持预设变量和自动提取变量两种
