# Task 1: 类型定义扩展

**Context:** This is the first task in the RequestRewrite feature implementation. We're extending the existing Headers functionality to support Request/Response Body rewriting with multiple methods (text, jsonPath, regex, script) and a variable system.

**Files:**
- Create: `src/types/requestRewrite.ts`
- Create: `src/types/variable.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `RequestRewriteRule`, `HeaderAction`, `BodyRewriteAction`, `RequestRewriteProfile`
- Produces: `PresetVariable`, `AutoExtractVariable`

---

## Steps

- [ ] **Step 1: 创建变量类型定义**

```typescript
// src/types/variable.ts

export interface PresetVariable {
  name: string
  value: string
  description?: string
}

export interface AutoExtractVariable {
  name: string
  source: 'localStorage' | 'sessionStorage' | 'cookie' | 'meta'
  key: string
}

export type Variable = PresetVariable | AutoExtractVariable
```

- [ ] **Step 2: 创建规则类型定义**

```typescript
// src/types/requestRewrite.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'
export type HeaderTarget = 'request' | 'response'
export type BodyRewriteMethod = 'text' | 'jsonPath' | 'regex' | 'script'

export interface HeaderAction {
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
}

export interface BodyRewriteAction {
  method: BodyRewriteMethod
  // text
  find?: string
  replace?: string
  // jsonPath
  path?: string
  value?: string
  // regex
  pattern?: string
  replacement?: string
  // script
  scriptBody?: string
}

export interface RequestRewriteRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  target: HeaderTarget
  headers: HeaderAction[]
  bodyRewrites: BodyRewriteAction[]
}

export interface RequestRewriteProfile {
  id: string
  name: string
  enabled: boolean
  rules: RequestRewriteRule[]
}

// 旧数据结构（用于迁移）
export interface LegacyHeaderRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
  target: HeaderTarget
}

export interface LegacyHeaderProfile {
  id: string
  name: string
  enabled: boolean
  rules: LegacyHeaderRule[]
}
```

- [ ] **Step 3: 更新类型导出**

```typescript
// src/types/index.ts

export * from './common'
export * from './requestRewrite'
export * from './variable'

// 向后兼容别名
export type { RequestRewriteRule as HeaderRule, RequestRewriteProfile as HeaderProfile } from './requestRewrite'
```

- [ ] **Step 4: 提交**

```bash
git add src/types/requestRewrite.ts src/types/variable.ts src/types/index.ts
git commit -m "feat: add RequestRewrite and Variable type definitions"
```

---

**Global Constraints:**
- Tab名称统一变更：Headers → RequestRewrite（Popup、Manager、DevTools）
- 数据结构向后兼容，支持自动迁移旧数据
- 规则支持多个Header操作和多个Body改写操作叠加执行
- UI使用Tailwind CSS，保持与现有风格一致
