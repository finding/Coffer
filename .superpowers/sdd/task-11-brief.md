# Task 11: 更新Manifest

**Context:** This task adds content_scripts configuration to manifest.json and updates vite config for the content entry.

**Files:**
- Modify: `manifest.json`
- Modify: `vite.config.ts` (if needed for content entry)

---

## Steps

- [ ] **Step 1: 添加content_scripts配置**

Add to manifest.json:
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ]
}
```

- [ ] **Step 2: 更新vite.config.ts添加content入口**

Ensure vite config includes content entry in build.rollupOptions.input.

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: content.js generated in dist

- [ ] **Step 4: 提交**

```bash
git add manifest.json vite.config.ts
git commit -m "feat: add content_scripts to manifest"
```

---

**Global Constraints:**
- Content Script必须在document_start注入
- all_frames: true 确保所有iframe都注入
