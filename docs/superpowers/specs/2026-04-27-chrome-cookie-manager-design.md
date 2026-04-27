# Chrome Cookie Manager - 设计文档

## 概述

一个现代化的 Chrome 浏览器扩展，提供 cookie 的完整管理能力，包括增删改查、跨网站/跨Tab/跨无痕模式的复制粘贴、批量操作和高级筛选功能。

## 目标用户

- 开发者：调试时同步多环境登录状态
- 普通用户：日常浏览时管理 cookie
- 安全测试人员：渗透测试时操作 cookie

---

## 1. 架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Extension                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Popup     │  │  DevTools   │  │ Background  │  │
│  │  (Vue App)  │  │  (Vue App)  │  │  (Service)  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                │         │
│         └────────────────┼────────────────┘         │
│                          ▼                          │
│              ┌─────────────────────┐                │
│              │   Pinia Store       │                │
│              │  - cookieStore      │                │
│              │  - clipboardStore   │                │
│              │  - settingStore     │                │
│              └─────────────────────┘                │
│                          │                          │
│                          ▼                          │
│              ┌─────────────────────┐                │
│              │   Services          │                │
│              │  - CookieManager    │                │
│              │  - ClipboardService │                │
│              │  - StorageService   │                │
│              └─────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

### 1.2 模块职责

| 模块 | 职责 |
|------|------|
| Popup | 快捷操作：显示状态、一键复制/粘贴/删除、导入导出 |
| DevTools | 完整管理：列表、筛选、增删改查、批量操作、设置 |
| Background | 监听 cookie 变化、跨 context 通信、持久化存储 |
| Services | 业务逻辑封装，供 UI 层调用 |

---

## 2. 模块详细设计

### 2.1 Popup - 快捷操作面板

**功能清单**：
- 显示当前域名 cookie 数量
- 一键复制全部 cookie
- 一键粘贴剪贴板中的 cookie
- 一键删除全部 cookie
- 导入文件（JSON）
- 导出文件（JSON）

**组件结构**：
```
popup/
├── App.vue
├── main.ts
└── components/
    ├── QuickActions.vue    # 快捷按钮组
    └── StatusCard.vue      # 状态显示
```

### 2.2 DevTools - 完整管理面板

**功能清单**：
- Cookie 列表展示（分页/虚拟滚动）
- 搜索（按名称、值、域名）
- 筛选（按属性：HttpOnly、Secure、SameSite）
- 域名分组
- 时间范围过滤
- 单个 cookie 增删改查
- 多选批量操作（删除、复制、导出）
- 设置面板（存储策略、主题）

**组件结构**：
```
devtools/
├── App.vue
├── main.ts
└── components/
    ├── CookieList.vue      # Cookie列表
    ├── CookieDetail.vue    # 编辑单个
    ├── FilterBar.vue       # 筛选栏
    ├── BatchActions.vue    # 批量操作
    └── SettingsPanel.vue   # 设置面板
```

### 2.3 Background Service Worker

**职责**：
- 监听 `chrome.cookies.onChanged` 事件，广播到各面板
- 监听 `chrome.runtime.onMessage`，处理跨 context 通信
- 管理 Chrome Storage 持久化
- 处理跨无痕模式的 cookie 桥接

---

## 3. 数据模型

### 3.1 CookieItem

```typescript
interface CookieItem {
  name: string            // cookie名称
  value: string           // cookie值
  domain: string          // 域名
  path: string            // 路径
  secure: boolean         // 是否仅HTTPS
  httpOnly: boolean       // 是否HttpOnly
  sameSite: string        // "lax" | "strict" | "no_restriction"
  expirationDate?: number // 过期时间戳（可选）
  storeId: string         // 存储ID（区分普通/无痕）
}
```

### 3.2 ClipboardItem

```typescript
interface ClipboardItem {
  cookies: CookieItem[]   // 复制的cookie集合
  sourceDomain: string    // 来源域名
  copiedAt: number        // 复制时间戳
  label?: string          // 用户标签（可选）
}
```

### 3.3 Pinia Store 数据

```typescript
// Cookie Store
interface CookieState {
  cookies: CookieItem[]
  filteredCookies: CookieItem[]
  currentDomain: string
  filters: {
    keyword: string
    domain: string
    attributes: string[]      // ['httpOnly', 'secure']
    timeRange: { start: number, end: number } | null
  }
}

// Clipboard Store
interface ClipboardState {
  items: ClipboardItem[]      // 支持多条剪贴记录
  activeIndex: number         // 当前激活的记录
  persistMode: boolean        // 是否持久化到 Chrome Storage
}

// Setting Store
interface SettingState {
  persistMode: boolean        // 默认存储策略
  theme: 'light' | 'dark'
  maxClipboardItems: number   // 最大剪贴记录数
}
```

---

## 4. 核心功能流程

### 4.1 复制 Cookie

```
用户点击"复制"
  → Pinia Action: copyCookies()
  → 读取当前筛选的 cookies
  → 存入 clipboardStore
  → 如果 persistMode=true，写入 Chrome Storage
  → 显示成功提示
```

### 4.2 粘贴 Cookie

```
用户点击"粘贴"
  → Pinia Action: pasteCookies()
  → 从 clipboardStore 获取目标 cookies
  → 检查目标域名权限（如需跨域）
  → 调用 chrome.cookies.set 逐个写入
  → 更新 UI 显示新 cookie
```

### 4.3 跨无痕模式粘贴

```
无痕模式面板发起粘贴请求
  → 发送消息到 Background
  → Background 从 Chrome Storage 读取剪贴板数据
  → 返回给无痕面板
  → 无痕面板执行粘贴
```

**前提条件**：用户需在扩展设置中开启"在无痕模式下运行"

### 4.4 导入导出

```
导出流程：
  cookies → JSON.stringify → 触发下载

导入流程：
  选择文件 → FileReader → JSON.parse → 验证结构 → 写入 cookies
```

---

## 5. 项目结构

```
cookie-manager/
├── manifest.json              # 扩展配置 (MV3)
├── package.json
├── vite.config.ts             # Vite构建配置
├── public/
│   └── icons/                 # 扩展图标
├── src/
│   ├── popup/                 # Popup应用
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── components/
│   │       ├── QuickActions.vue
│   │       └── StatusCard.vue
│   ├── devtools/              # DevTools应用
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── components/
│   │       ├── CookieList.vue
│   │       ├── CookieDetail.vue
│   │       ├── FilterBar.vue
│   │       ├── BatchActions.vue
│   │       └── SettingsPanel.vue
│   ├── background/            # Service Worker
│   │   └── index.ts
│   ├── stores/                # Pinia stores
│   │   ├── cookieStore.ts
│   │   ├── clipboardStore.ts
│   │   └── settingStore.ts
│   ├── services/              # 业务逻辑
│   │   ├── cookieManager.ts
│   │   ├── clipboardService.ts
│   │   └── storageService.ts
│   ├── composables/           # Vue组合式函数
│   │   └── useCookie.ts
│   ├── types/                 # TypeScript类型
│   │   └── index.ts
│   └── styles/                # 全局样式
│       └── modern.css
└── tests/                     # 测试文件
    ├── unit/
    └── e2e/
```

---

## 6. UI 设计规范

### 6.1 风格

- 遵循 Chrome 扩展设计准则
- 清爽扁平风格
- 统一的间距和圆角
- 主色调：Chrome 蓝 (#4285F4)
- 按钮带悬停效果

### 6.2 响应式

- Popup 固定宽度 320px
- DevTools 自适应开发者工具面板宽度

---

## 7. 技术栈

- **框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **构建工具**: Vite
- **Manifest 版本**: MV3
- **UI 组件**: 自定义组件（无第三方 UI 库）
- **样式**: Tailwind CSS
- **测试**: Vitest (单元) + Playwright (E2E)

---

## 8. 权限需求

```json
{
  "permissions": [
    "cookies",
    "storage",
    "activeTab",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

---

## 9. 待办事项

- [ ] 实现 Popup 基础框架
- [ ] 实现 DevTools 基础框架
- [ ] 实现 Background Service Worker
- [ ] 实现 CookieManager 服务
- [ ] 实现 ClipboardService 服务
- [ ] 实现 Pinia stores
- [ ] 实现 UI 组件
- [ ] 实现跨无痕模式通信
- [ ] 编写单元测试
- [ ] 编写 E2E 测试
