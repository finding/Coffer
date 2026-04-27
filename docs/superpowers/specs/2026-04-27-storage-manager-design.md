# Storage Manager - 设计文档

## 概述

在现有 Cookie Manager 基础上添加 localStorage 和 sessionStorage 管理功能，通过 Tab 切换展示，提供与 Cookie 管理一致的 CRUD 和复制粘贴功能。

---

## 1. UI 设计

### Tab 导航

在 Manager 页面顶部添加 Tab 导航：
```
[Cookies] [LocalStorage] [SessionStorage]
```

### 布局复用

Storage 管理面板复用 Cookie 列表的 UI 结构：
- FilterBar - 搜索/筛选
- StorageList - key-value 列表
- BatchActions - 批量操作
- StorageDetail - 编辑弹窗

---

## 2. 功能清单

### 基础功能

| 功能 | 说明 |
|------|------|
| 列表展示 | 显示当前域名的 storage key-value 对 |
| 搜索 | 按 key 或 value 搜索 |
| 新增 | 添加新的 key-value 对 |
| 编辑 | 修改 key 或 value |
| 删除 | 删除单个或批量删除 |
| 导出 | 导出为 JSON 文件 |
| 导入 | 从 JSON 文件导入 |

### 复制粘贴

| 功能 | 说明 |
|------|------|
| 单项复制 | 点击 key/value 复制整条数据到剪贴板（JSON）+ 内部缓存 |
| 批量复制 | 复制选中的多条数据 |
| 粘贴 | 从内部缓存或系统剪贴板粘贴 |
| 跨域粘贴 | 支持粘贴到不同域名 |

---

## 3. 技术实现

### 获取 Storage 数据

通过 Content Script 注入到页面获取：

```typescript
// Content script
chrome.scripting.executeScript({
  target: { tabId },
  func: () => ({
    local: Object.entries(localStorage).map(([key, value]) => ({ key, value })),
    session: Object.entries(sessionStorage).map(([key, value]) => ({ key, value }))
  })
})
```

### 设置 Storage 数据

```typescript
// Content script
chrome.scripting.executeScript({
  target: { tabId },
  func: (items, type) => {
    const storage = type === 'local' ? localStorage : sessionStorage;
    items.forEach(({ key, value }) => storage.setItem(key, value));
  },
  args: [items, type]
})
```

### 删除 Storage 数据

```typescript
// Content script
chrome.scripting.executeScript({
  target: { tabId },
  func: (key, type) => {
    const storage = type === 'local' ? localStorage : sessionStorage;
    storage.removeItem(key);
  },
  args: [key, type]
})
```

---

## 4. 数据模型

### StorageItem

```typescript
interface StorageItem {
  key: string
  value: string
}
```

### StorageClipboardItem

```typescript
interface StorageClipboardItem {
  items: StorageItem[]
  sourceDomain: string
  storageType: 'local' | 'session'
  copiedAt: number
}
```

---

## 5. 新增文件

```
src/
├── services/
│   └── storageDataManager.ts    # Storage 数据操作服务
├── stores/
│   ├── localStorageStore.ts     # localStorage Pinia store
│   └── sessionStorageStore.ts  # sessionStorage Pinia store
├── devtools/components/
│   ├── StorageList.vue          # Storage 列表组件
│   └── StorageDetail.vue        # 编辑弹窗组件
├── manager/components/
│   ├── TabNav.vue               # Tab 导航
│   └── StoragePanel.vue         # Storage 管理面板
├── content/
│   └── storage.ts               # Content script (注入获取/设置)
```

---

## 6. 权限更新

```json
{
  "permissions": [
    "cookies",
    "storage",
    "activeTab",
    "tabs",
    "scripting"
  ]
}
```

需要新增 `scripting` 权限用于注入脚本获取/设置 Storage。

---

## 7. 实现步骤

1. 添加 `scripting` 权限到 manifest
2. 实现 StorageDataManager 服务
3. 实现 Pinia stores
4. 实现 Tab 导航组件
5. 实现 Storage 管理面板组件
6. 集成到 Manager 页面
7. 测试验证
