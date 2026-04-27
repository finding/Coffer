# Coffer

中文 | [English](./README.md)

一个安全的 Cookie 和 Storage 数据管理工具 - 支持跨标签页、跨无痕模式的复制粘贴。

## 功能特性

### Cookie 管理
- **查看与编辑**：检查所有 Cookie 的详细信息（名称、值、域名、路径、安全属性、HttpOnly、过期时间）
- **复制与粘贴**：从一个域名复制 Cookie 并粘贴到另一个域名，支持跨标签页和无痕模式
- **批量操作**：选择多个 Cookie 进行批量复制、删除或导出
- **导入与导出**：以 JSON 格式导入/导出 Cookie
- **点击复制**：点击 Cookie 名称或值即可复制到剪贴板

### Storage 管理
- **LocalStorage 和 SessionStorage**：完整支持两种存储类型
- **查看与编辑**：检查和修改存储的键值对
- **复制与粘贴**：在不同页面或标签页之间复制存储项
- **隔离剪贴板**：LocalStorage 和 SessionStorage 的剪贴板数据分开存储
- **批量操作**：选择多个项目进行批量操作
- **导入与导出**：以 JSON 格式导入/导出存储数据

### 用户界面
- **弹出窗口**：当前标签页的快捷操作（全部复制、粘贴、全部删除、导入/导出）
- **管理页面**：功能完整的管理界面，带有 Cookies/LocalStorage/SessionStorage 标签页
- **开发者工具面板**：集成到 Chrome DevTools 中，方便开发者使用
- **域名过滤**：通过智能匹配按域名过滤 Cookie

## 安装

1. 克隆或下载此仓库
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 构建扩展
4. 打开 Chrome，访问 `chrome://extensions/`
5. 在右上角启用"开发者模式"
6. 点击"加载已解压的扩展程序"，选择 `dist` 文件夹

## 使用方法

### 弹出窗口
点击扩展图标打开弹出窗口：
- 在 **Cookies**、**Local**、**Session** 标签之间切换
- **复制全部**：将所有项目复制到剪贴板（JSON 格式）
- **粘贴**：从剪贴板或扩展存储中粘贴
- **删除全部**：删除所有项目
- **导入/导出**：加载或保存 JSON 文件
- **打开管理器**：打开完整的管理页面

### 管理页面
功能完整的界面包括：
- 标签导航（Cookies / LocalStorage / SessionStorage）
- 搜索和过滤功能
- 批量选择和操作
- 编辑单个项目
- 点击名称或值进行复制

### 开发者工具面板
打开 Chrome DevTools（F12），找到"Coffer"面板：
- 查看当前页面的所有 Cookie
- 快速编辑和删除操作

## 数据格式

### Cookies（JSON）
```json
[
  {
    "name": "session_id",
    "value": "abc123",
    "domain": ".example.com",
    "path": "/",
    "secure": true,
    "httpOnly": false,
    "sameSite": "lax",
    "expirationDate": 1234567890,
    "storeId": "0"
  }
]
```

### Storage 项目（JSON）
```json
[
  {
    "key": "user_token",
    "value": "xyz789"
  }
]
```

## 安全警告

⚠️ **重要安全提示**

### 敏感数据
Cookie 和存储数据通常包含敏感信息：
- 会话令牌和认证凭据
- 个人用户数据和偏好设置
- API 密钥和访问令牌
- 购物车内容和用户状态

⚠️ **请勿将导出的数据分享给他人 - 这可能导致账号被盗和数据泄露**

### 最佳实践
1. **切勿分享导出的 JSON 文件** - 它们包含明文敏感数据
2. **粘贴 Cookie 时要谨慎** - 只粘贴到受信任的域名
3. **使用后清除剪贴板** - 不要在剪贴板中保留敏感数据
4. **避免在公共电脑上使用** - 数据可能被缓存或记录
5. **导入前先检查** - 始终检查导入文件的内容

### 跨域风险
将 Cookie 从一个域名复制到另一个域名时：
- 如果恶意粘贴 Cookie，可能导致会话劫持
- 粘贴前务必验证目标域名
- 注意粘贴 Cookie 可能绕过安全措施

### 无痕模式
- 从无痕模式复制的 Cookie 可能包含敏感会话数据
- 粘贴到普通模式会使原本临时的数据持久化
- 在无痕窗口和普通窗口之间传输数据时要小心

### 数据存储
- 剪贴板数据存储在 `chrome.storage.local` 中
- 这些数据会在浏览器会话之间持久保存
- 建议定期清除扩展存储

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 运行测试
npm test
```

## 发布版本

创建新版本：

```bash
npm run release 1.0.0
```

此命令会：
1. 更新 `package.json` 和 `manifest.json` 中的版本号
2. 提交更改
3. 创建并推送标签
4. GitHub Action 将自动构建并创建发布

或手动操作：

1. 更新 `package.json` 和 `manifest.json` 中的版本号
2. 提交更改：`git commit -am "chore: bump version to x.x.x"`
3. 创建标签：`git tag vx.x.x`
4. 推送标签：`git push origin vx.x.x`
5. GitHub Action 将自动构建并创建发布

## 技术栈

- Vue 3 + TypeScript
- Pinia（状态管理）
- Tailwind CSS
- Vite
- Chrome Extension Manifest V3

## 许可证

MIT 许可证 - 使用风险自负。作者不对使用此扩展导致的任何安全事件或数据泄露负责。

## 贡献

欢迎贡献！请确保任何拉取请求：
1. 遵循现有代码风格
2. 包含适当的测试
3. 不引入安全漏洞
4. 根据需要更新文档
