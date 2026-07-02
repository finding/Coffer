# Task 11 Review Package

## Commit History
```
6f0cb68 feat: add content_scripts to manifest and vite config
```

## Diff Stats
```
 manifest.json  | 8 ++++++++
 vite.config.ts | 3 ++-
 2 files changed, 10 insertions(+), 1 deletion(-)
```

## Full Diff
diff --git a/manifest.json b/manifest.json
index 49c1a75..b128e29 100644
--- a/manifest.json
+++ b/manifest.json
@@ -23,20 +23,28 @@
       "16": "icons/icon16.png",
       "48": "icons/icon48.png",
       "128": "icons/icon128.png"
     }
   },
   "devtools_page": "src/devtools/index.html",
   "background": {
     "service_worker": "background.js",
     "type": "module"
   },
+  "content_scripts": [
+    {
+      "matches": ["<all_urls>"],
+      "js": ["content.js"],
+      "run_at": "document_start",
+      "all_frames": true
+    }
+  ],
   "icons": {
     "16": "icons/icon16.png",
     "48": "icons/icon48.png",
     "128": "icons/icon128.png"
   },
   "web_accessible_resources": [
     {
       "resources": [
         "src/manager/index.html",
         "manager.js",
diff --git a/vite.config.ts b/vite.config.ts
index ac16a34..b8a04cb 100644
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -15,21 +15,22 @@ export default defineConfig({
       }
     }
   ],
   build: {
     outDir: 'dist',
     rollupOptions: {
       input: {
         popup: resolve(__dirname, 'src/popup/index.html'),
         devtools: resolve(__dirname, 'src/devtools/index.html'),
         manager: resolve(__dirname, 'src/manager/index.html'),
-        background: resolve(__dirname, 'src/background/index.ts')
+        background: resolve(__dirname, 'src/background/index.ts'),
+        content: resolve(__dirname, 'src/content/index.ts')
       },
       output: {
         entryFileNames: '[name].js',
         chunkFileNames: 'chunks/[name].[hash].js',
         assetFileNames: 'assets/[name].[ext]'
       }
     }
   },
   resolve: {
     alias: {
