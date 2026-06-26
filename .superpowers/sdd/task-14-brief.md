# Task 14: UI组件 - 规则编辑弹窗改造

**Context:** This task refactors the rule editing modal in RequestRewriteManager.vue to support combined Headers + Body configuration with tab switching.

**Files:**
- Modify: `src/manager/components/RequestRewriteManager.vue`

**Interfaces:**
- Consumes: `RequestRewriteRule`, `HeaderAction`, `BodyRewriteAction` types
- Produces: Tab-based rule editor with Headers and Body sections

---

## Key Changes

1. **Rule Form Structure:**
   - Add `headers: HeaderAction[]` array (replacing single header fields)
   - Add `bodyRewrites: BodyRewriteAction[]` array
   - Add `ruleEditTab` for tab state ('headers' | 'body')

2. **Headers Tab:**
   - List of header actions with action type dropdown (add/modify/remove)
   - Header name and value inputs
   - Add/remove buttons

3. **Body Tab:**
   - Method selector (text/jsonPath/regex/script)
   - Method-specific fields based on selection:
     - text: find, replace
     - jsonPath: path, value
     - regex: pattern, replacement (with test icon)
     - script: scriptBody textarea
   - Add/remove buttons for multiple rewrites

---

## Steps

- [ ] **Step 1: Update ruleForm structure**

Change from single header to multiple headers + bodyRewrites:
```typescript
const ruleForm = ref({
  name: '',
  urlPattern: '*://*/*',
  methods: ['ALL'] as HttpMethod[],
  target: 'request' as HeaderTarget,
  headers: [{ action: 'add' as const, headerName: '', headerValue: '' }],
  bodyRewrites: [] as BodyRewriteAction[]
})
```

- [ ] **Step 2: Add tab switching UI**

```vue
<div class="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1">
  <button @click="ruleEditTab = 'headers'" :class="...">
    Headers ({{ ruleForm.headers.length })
  </button>
  <button @click="ruleEditTab = 'body'" :class="...">
    Body ({{ ruleForm.bodyRewrites.length })
  </button>
</div>
```

- [ ] **Step 3: Update saveRule and editRule functions**

Use new structure when saving/editing rules.

- [ ] **Step 4: 提交**

```bash
git add src/manager/components/RequestRewriteManager.vue
git commit -m "feat: refactor rule editor with Headers/Body tabs"
```

---

**Global Constraints:**
- 规则支持多个Header操作和多个Body改写操作叠加执行
- UI使用Tailwind CSS，保持与现有风格一致
