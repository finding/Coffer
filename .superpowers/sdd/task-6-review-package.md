diff --git a/src/popup/App.vue b/src/popup/App.vue
index 2ceb731..d00ddb8 100644
--- a/src/popup/App.vue
+++ b/src/popup/App.vue
@@ -1,29 +1,44 @@
 <template>
   <div class="w-80 p-4 bg-gray-50 min-h-[400px]">
-    <StatusCard 
-      :domain="currentDomain" 
+    <StatusCard
+      :domain="currentDomain"
       :cookie-count="cookieCount"
       :local-storage-count="localStorageCount"
       :session-storage-count="sessionStorageCount"
     />
+    <div class="flex gap-1 mb-3">
+      <button
+        v-for="m in ['cookies', 'local', 'session', 'headers']"
+        :key="m"
+        @click="currentMode = m as any"
+        :class="[
+          'px-3 py-1.5 text-sm rounded transition-colors',
+          currentMode === m ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
+        ]"
+      >
+        {{ m === 'cookies' ? 'Cookies' : m === 'local' ? 'Local' : m === 'session' ? 'Session' : 'Headers' }}
+      </button>
+    </div>
     <QuickActions
+      v-if="currentMode !== 'headers'"
       :loading="loading"
       :count="currentCount"
       :mode="currentMode"
       @update:mode="currentMode = $event"
       @copy="handleCopy"
       @paste="handlePaste"
       @delete="handleDelete"
       @import="handleImport"
       @export="handleExport"
     />
+    <HeadersTab v-else @open-manager="openManager" />
     <button
       @click="openManager"
       class="w-full mt-4 py-2 px-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
     >
       <span>🔧</span>
       <span>Open Manager</span>
     </button>
     <div v-if="message" :class="['mt-4 p-2 rounded text-sm', messageClass]">
       {{ message }}
     </div>
@@ -35,42 +50,44 @@ import { ref, computed, onMounted } from 'vue'
 import { useCookieStore } from '@/stores/cookieStore'
 import { useClipboardStore } from '@/stores/clipboardStore'
 import { useSettingStore } from '@/stores/settingStore'
 import { useLocalStorageStore } from '@/stores/localStorageStore'
 import { useSessionStorageStore } from '@/stores/sessionStorageStore'
 import { cookieManager } from '@/services/cookieManager'
 import { storageService } from '@/services/storageService'
 import type { CookieItem, StorageItem } from '@/types'
 import StatusCard from './components/StatusCard.vue'
 import QuickActions from './components/QuickActions.vue'
+import HeadersTab from './components/HeadersTab.vue'
 
 const cookieStore = useCookieStore()
 const clipboardStore = useClipboardStore()
 const settingStore = useSettingStore()
 const localStorageStore = useLocalStorageStore()
 const sessionStorageStore = useSessionStorageStore()
 
 const loading = ref(false)
 const message = ref('')
 const messageType = ref<'success' | 'error'>('success')
 const currentTabId = ref<number | null>(null)
-const currentMode = ref<'cookies' | 'local' | 'session'>('cookies')
+const currentMode = ref<'cookies' | 'local' | 'session' | 'headers'>('cookies')
 
 const currentDomain = computed(() => cookieStore.currentDomain)
 const cookieCount = computed(() => cookieStore.cookieCount)
 const localStorageCount = computed(() => localStorageStore.items.length)
 const sessionStorageCount = computed(() => sessionStorageStore.items.length)
 
 const currentCount = computed(() => {
   if (currentMode.value === 'cookies') return cookieCount.value
   if (currentMode.value === 'local') return localStorageCount.value
-  return sessionStorageCount.value
+  if (currentMode.value === 'session') return sessionStorageCount.value
+  return 0  // headers 模式暂不显示数量
 })
 
 const messageClass = computed(() =>
   messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
 )
 
 function showMessage(text: string, type: 'success' | 'error' = 'success') {
   message.value = text
   messageType.value = type
   setTimeout(() => { message.value = '' }, 3000)
diff --git a/src/popup/components/HeadersTab.vue b/src/popup/components/HeadersTab.vue
new file mode 100644
index 0000000..97a03e8
--- /dev/null
+++ b/src/popup/components/HeadersTab.vue
@@ -0,0 +1,86 @@
+<!-- src/popup/components/HeadersTab.vue -->
+<template>
+  <div class="p-2">
+    <div class="flex items-center gap-2 mb-3">
+      <select
+        v-model="selectedProfileId"
+        @change="handleProfileChange"
+        class="flex-1 px-2 py-1.5 border rounded text-sm"
+      >
+        <option :value="null">No Profile Active</option>
+        <option v-for="p in profiles" :key="p.id" :value="p.id">
+          {{ p.name }} ({{ p.rules.length }} rules)
+        </option>
+      </select>
+      <button
+        @click="$emit('openManager')"
+        class="px-2 py-1.5 bg-gray-200 rounded hover:bg-gray-300 text-sm"
+      >
+        Manage
+      </button>
+    </div>
+
+    <div v-if="activeProfile" class="space-y-1">
+      <div
+        v-for="rule in activeProfile.rules"
+        :key="rule.id"
+        class="flex items-center gap-2 p-2 bg-white rounded border"
+      >
+        <input
+          type="checkbox"
+          :checked="rule.enabled"
+          @change="toggleRule(rule.id)"
+          class="w-4 h-4"
+        >
+        <div class="flex-1 min-w-0">
+          <div class="text-sm font-medium truncate">{{ rule.name }}</div>
+          <div class="text-xs text-gray-500 truncate">{{ rule.headerName }}</div>
+        </div>
+        <span class="text-xs px-1.5 py-0.5 rounded" :class="getTargetClass(rule.target)">
+          {{ rule.target }}
+        </span>
+      </div>
+    </div>
+
+    <div v-else class="text-center py-4 text-gray-500 text-sm">
+      No profile active
+    </div>
+  </div>
+</template>
+
+<script setup lang="ts">
+import { ref, computed, onMounted, watch } from 'vue'
+import { useHeaderRuleStore } from '@/stores/headerRuleStore'
+
+defineEmits<{ openManager: [] }>()
+
+const store = useHeaderRuleStore()
+const selectedProfileId = ref<string | null>(null)
+
+const profiles = computed(() => store.profiles)
+const activeProfile = computed(() => store.activeProfile)
+
+function handleProfileChange() {
+  store.setActiveProfile(selectedProfileId.value)
+}
+
+async function toggleRule(ruleId: string) {
+  if (!activeProfile.value) return
+  const rule = activeProfile.value.rules.find(r => r.id === ruleId)
+  if (rule) {
+    await store.updateRule(activeProfile.value.id, ruleId, { enabled: !rule.enabled })
+  }
+}
+
+function getTargetClass(target: 'request' | 'response') {
+  return target === 'request' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
+}
+
+onMounted(() => {
+  store.loadProfiles()
+})
+
+watch(() => store.activeProfileId, (id) => {
+  selectedProfileId.value = id
+}, { immediate: true })
+</script>
diff --git a/src/popup/components/QuickActions.vue b/src/popup/components/QuickActions.vue
index 3393acd..5933b9f 100644
--- a/src/popup/components/QuickActions.vue
+++ b/src/popup/components/QuickActions.vue
@@ -40,24 +40,24 @@
       </button>
       <button @click="$emit('export')" :disabled="count === 0"
         class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
         Export
       </button>
     </div>
   </div>
 </template>
 
 <script setup lang="ts">
-defineProps<{ 
+defineProps<{
   loading: boolean
   count: number
-  mode: 'cookies' | 'local' | 'session'
+  mode: 'cookies' | 'local' | 'session' | 'headers'
 }>()
-defineEmits<{ 
+defineEmits<{
   copy: []
   paste: []
   delete: []
   import: []
   export: []
-  'update:mode': ['cookies' | 'local' | 'session']
+  'update:mode': ['cookies' | 'local' | 'session' | 'headers']
 }>()
 </script>
