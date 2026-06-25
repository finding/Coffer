# Header Modifier 功能设计文档

日期：2026-06-25

## 功能概述

为 Coffer 扩展添加请求头和响应头修改功能，类似 ModHeader 插件。支持基于 URL 匹配和 HTTP 方法的规则配置，支持多配置文件管理和快速切换。

## 使用场景

1. 开发调试：在开发时模拟不同环境（如添加测试用的 Authorization header）
2. 测试/安全研究：用于 API 测试、渗透测试等安全相关工作
3. 日常浏览：绕过某些限制或添加自定义 header

## 核心功能

### Header 操作
- 添加（add）：向请求/响应添加新 header
- 修改（modify）：覆盖已存在的 header 值
- 删除（remove）：移除指定 header

### 匹配条件
- URL 匹配：支持通配符模式（如 `*://api.example.com/*`）
- HTTP 方法过滤：可选 GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS，或全部

### 规则优先级
- 规则按列表顺序从上到下依次应用
- 相同 header name 时，后面的规则覆盖前面的
- 支持拖拽排序调整优先级

### Profile 管理
- 多配置文件支持（如 Dev、Staging、Prod 环境）
- 配置文件快速切换
- 导入/导出 JSON 格式

## 数据结构

### Profile
```typescript
interface Profile {
  id: string;
  name: string;           // 如 "Dev Environment", "Staging API"
  enabled: boolean;       // 是否激活
  rules: Rule[];
}
```

### Rule
```typescript
interface Rule {
  id: string;
  enabled: boolean;
  name: string;           // 规则名称，便于识别
  
  // 匹配条件
  urlPattern: string;     // URL 匹配模式，如 "*://api.example.com/*"
  methods: HttpMethod[];  // 请求方法过滤
  
  // 操作
  action: 'add' | 'modify' | 'remove';
  headerName: string;
  headerValue: string;    // remove 操作时可为空
  
  // 目标
  target: 'request' | 'response';  // 请求头或响应头
}
```

### HttpMethod
```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL';
```

## UI 设计

### Popup（快速操作）
在现有 Cookies/Local/Session tabs 后新增 "Headers" tab：
- 当前激活的 Profile 名称和快速切换下拉框
- 规则列表（精简显示：规则名、状态开关、URL pattern）
- 快速操作按钮：新建规则、全部启用、全部禁用
- 链接到 Manager 页面

### Manager 页面（完整配置）
在现有 tabs 后新增 "Headers" tab：
- Profile 管理：列表、新建、编辑名称、删除、导入/导出
- 当前 Profile 的规则列表：
  - 支持拖拽排序
  - 每条规则显示：开关、名称、URL pattern、方法过滤、header name/value、操作类型、target
  - 编辑/删除按钮
- 规则编辑弹窗：完整表单编辑规则详情

### DevTools 面板（开发调试）
新增 "Headers" 面板：
- 当前激活 Profile
- 规则列表（可折叠展开）
- 快速开关切换
- 请求日志：显示最近匹配的请求及其应用的 header 规则（可选功能）

## 技术实现

### 权限声明
在 manifest.json 中添加：
```json
{
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback"
  ]
}
```

### 核心模块

**HeaderRuleService**（服务层）
- 管理 Profile 和 Rule 的 CRUD 操作
- 将 Rule 转换为 declarativeNetRequest API 格式
- 同步规则到 Chrome API

**HeaderRuleStore**（状态管理）
- 使用 Pinia 管理 Profiles 状态
- 持久化到 chrome.storage.local

### 规则转换
```typescript
function convertToChromeRule(rule: Rule): chrome.declarativeNetRequest.Rule {
  const headerOperation = {
    header: rule.headerName,
    operation: rule.action === 'add' ? 'append' : 
               rule.action === 'modify' ? 'set' : 'remove',
    value: rule.headerValue
  };

  return {
    id: parseInt(rule.id.slice(-6), 16),
    priority: 1,
    action: {
      type: rule.action === 'remove' ? 'removeHeaders' : 'modifyHeaders',
      requestHeaders: rule.target === 'request' ? [headerOperation] : undefined,
      responseHeaders: rule.target === 'response' ? [headerOperation] : undefined
    },
    condition: {
      urlFilter: rule.urlPattern,
      requestMethods: rule.methods.includes('ALL') ? undefined : rule.methods,
      resourceTypes: ['xmlhttprequest', 'script', 'image', 'stylesheet', 'media', 'font', 'document']
    }
  };
}
```

### 规则优先级实现
- 使用 declarativeNetRequest 的 `priority` 字段
- 用户界面拖拽顺序转换为 priority 值（从高到低）
- Chrome API 内部处理同 priority 时的顺序

## 导入/导出格式

```json
{
  "version": "1.0",
  "profiles": [
    {
      "id": "profile-001",
      "name": "Dev Environment",
      "enabled": true,
      "rules": [
        {
          "id": "rule-001",
          "enabled": true,
          "name": "Add Auth Token",
          "urlPattern": "*://api.dev.example.com/*",
          "methods": ["GET", "POST", "PUT", "DELETE"],
          "action": "add",
          "headerName": "Authorization",
          "headerValue": "Bearer dev-token-123",
          "target": "request"
        }
      ]
    }
  ]
}
```

## 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| 规则数量超过 Chrome 限制（5000条） | 提示用户，阻止新增，建议拆分 Profile |
| URL pattern 格式错误 | 实时验证，显示错误提示，保存时阻止 |
| Header name 为空 | 必填字段验证，阻止保存 |
| Profile 删除时有规则生效中 | 确认提示，删除前先禁用所有规则 |
| 切换 Profile | 先清空当前规则，再加载新 Profile 规则 |
| Header value 包含特殊字符 | 允许，不做额外转义 |

## 文件结构

```
src/
├── services/
│   └── headerRuleService.ts      # 规则管理服务
├── stores/
│   └── headerRuleStore.ts        # Pinia 状态管理
├── types/
│   └── headerRule.ts             # 类型定义
├── popup/
│   └── components/
│       └── HeadersTab.vue        # Popup Headers tab
├── manager/
│   └── components/
│       └── HeadersManager.vue    # Manager Headers tab
└── devtools/
    └── components/
        └── HeadersPanel.vue      # DevTools Headers panel
```

## 实现计划概要

1. 添加类型定义和 Pinia store
2. 实现 HeaderRuleService 核心逻辑
3. 实现规则转换和 Chrome API 同步
4. 实现 Popup Headers Tab
5. 实现 Manager Headers Tab
6. 实现 DevTools Headers Panel
7. 添加导入/导出功能
8. 添加测试
9. 更新文档
