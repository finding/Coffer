# Task 15 Review Package

## Commit History
```
99de38d refactor: rename Headers tab to RequestRewrite globally
```

## Diff Stats
```
 src/devtools/App.vue              | 2 +-
 src/manager/components/TabNav.vue | 2 +-
 src/popup/App.vue                 | 2 +-
 3 files changed, 3 insertions(+), 3 deletions(-)
```

## Full Diff
diff --git a/src/devtools/App.vue b/src/devtools/App.vue
index efb3b66..7e461c6 100644
--- a/src/devtools/App.vue
+++ b/src/devtools/App.vue
@@ -6,21 +6,21 @@
         <button
           @click="activePanel = 'cookies'"
           :class="['px-3 py-1 text-sm rounded', activePanel === 'cookies' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
         >
           Cookies
         </button>
         <button
           @click="activePanel = 'headers'"
           :class="['px-3 py-1 text-sm rounded', activePanel === 'headers' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
         >
-          Headers
+          RequestRewrite
         </button>
       </div>
       <div class="flex-1"></div>
       <button @click="showNewModal = true" class="px-3 py-1.5 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 text-sm" v-if="activePanel === 'cookies'">New Cookie</button>
       <button @click="showSettings = true" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Settings</button>
       <button @click="refresh" class="px-3 py-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">Refresh</button>
     </header>
 
     <template v-if="activePanel === 'cookies'">
       <FilterBar
diff --git a/src/manager/components/TabNav.vue b/src/manager/components/TabNav.vue
index 569871d..f20633b 100644
--- a/src/manager/components/TabNav.vue
+++ b/src/manager/components/TabNav.vue
@@ -22,13 +22,13 @@ import { computed } from 'vue'
 const props = defineProps<{
   active: 'cookies' | 'local' | 'session' | 'headers';
   counts?: { cookies?: number; local?: number; session?: number; headers?: number }
 }>()
 defineEmits<{ 'update:active': ['cookies' | 'local' | 'session' | 'headers'] }>()
 
 const tabs = computed(() => [
   { id: 'cookies' as const, label: 'Cookies', count: props.counts?.cookies },
   { id: 'local' as const, label: 'LocalStorage', count: props.counts?.local },
   { id: 'session' as const, label: 'SessionStorage', count: props.counts?.session },
-  { id: 'headers' as const, label: 'Headers', count: props.counts?.headers }
+  { id: 'headers' as const, label: 'RequestRewrite', count: props.counts?.headers }
 ])
 </script>
\ No newline at end of file
diff --git a/src/popup/App.vue b/src/popup/App.vue
index e693b5d..9319229 100644
--- a/src/popup/App.vue
+++ b/src/popup/App.vue
@@ -10,21 +10,21 @@
     <div class="flex gap-1 mb-3 bg-gray-200 rounded-lg p-1">
       <button
         v-for="m in ['cookies', 'local', 'session', 'headers']"
         :key="m"
         @click="currentMode = m as any"
         :class="[
           'flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-colors',
           currentMode === m ? 'bg-white shadow' : 'hover:bg-gray-100'
         ]"
       >
-        {{ m === 'cookies' ? 'Cookies' : m === 'local' ? 'Local' : m === 'session' ? 'Session' : 'Headers' }}
+        {{ m === 'cookies' ? 'Cookies' : m === 'local' ? 'Local' : m === 'session' ? 'Session' : 'RequestRewrite' }}
       </button>
     </div>
 
     <QuickActions
       v-if="currentMode !== 'headers'"
       :loading="loading"
       :count="currentCount"
       :mode="currentMode"
       @update:mode="currentMode = $event"
       @copy="handleCopy"
