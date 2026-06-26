# Task 13 Review Package

## Commit History
```
38b1523 refactor: rename HeadersManager to RequestRewriteManager
```

## Diff Stats
```
 src/manager/App.vue                              |   4 +-
 src/manager/components/RequestRewriteManager.vue | 714 +++++++++++++++++++++++
 2 files changed, 716 insertions(+), 2 deletions(-)
```

## Full Diff
diff --git a/src/manager/App.vue b/src/manager/App.vue
index e4d9189..9f9f676 100644
--- a/src/manager/App.vue
+++ b/src/manager/App.vue
@@ -70,21 +70,21 @@
 
       <BatchActions
         :selected-count="selectedSessionStorageItems.size"
         @copy="handleStorageBatchCopy('session')"
         @delete="handleStorageBatchDelete('session')"
         @export="handleStorageBatchExport('session')"
       />
     </template>
 
     <template v-else-if="activeTab === 'headers'">
-      <HeadersManager />
+      <RequestRewriteManager />
     </template>
 
     <CookieDetail
       v-if="showDetailModal"
       :cookie="editingCookie"
       :domain="currentDomain"
       @close="closeDetailModal"
       @save="handleSave"
     />
 
@@ -134,21 +134,21 @@ import { cookieManager } from '@/services/cookieManager'
 import { storageService } from '@/services/storageService'
 import type { CookieItem, StorageItem } from '@/types'
 import FilterBar from '@/devtools/components/FilterBar.vue'
 import CookieList from '@/devtools/components/CookieList.vue'
 import CookieDetail from '@/devtools/components/CookieDetail.vue'
 import BatchActions from '@/devtools/components/BatchActions.vue'
 import SettingsPanel from '@/devtools/components/SettingsPanel.vue'
 import TabNav from '@/manager/components/TabNav.vue'
 import StorageList from '@/devtools/components/StorageList.vue'
 import StorageDetail from '@/devtools/components/StorageDetail.vue'
-import HeadersManager from '@/manager/components/HeadersManager.vue'
+import RequestRewriteManager from '@/manager/components/RequestRewriteManager.vue'
 
 const cookieStore = useCookieStore()
 const clipboardStore = useClipboardStore()
 const settingStore = useSettingStore()
 const localStorageStore = useLocalStorageStore()
 const sessionStorageStore = useSessionStorageStore()
 const headerRuleStore = useHeaderRuleStore()
 
 const activeTab = ref<'cookies' | 'local' | 'session' | 'headers'>('cookies')
 const selectedCookies = ref<Set<CookieItem>>(new Set())
diff --git a/src/manager/components/RequestRewriteManager.vue b/src/manager/components/RequestRewriteManager.vue
new file mode 100644
index 0000000..e9f6b2d
--- /dev/null
+++ b/src/manager/components/RequestRewriteManager.vue
@@ -0,0 +1,714 @@
+<!-- src/manager/components/HeadersManager.vue -->
+<template>
+  <div class="flex flex-col h-full">
+    <!-- Profile Bar -->
+    <div class="flex items-center gap-2 p-3 bg-white border-b">
+      <select
+        v-model="selectedProfileId"
+        @change="handleProfileChange"
+        class="px-3 py-1.5 border rounded text-sm"
+      >
+        <option :value="null">Select Profile</option>
+        <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
+      </select>
+      <button @click="showNewProfileModal = true" class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
+        New Profile
+      </button>
+      <button
+        v-if="selectedProfileId"
+        @click="showNewRuleModal = true"
+        class="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
+      >
+        New Rule
+      </button>
+      <div class="flex-1"></div>
+      <button @click="handleExport" class="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">
+        Export
+      </button>
+      <button @click="triggerImport" class="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">
+        Import
+      </button>
+      <input ref="fileInput" type="file" accept=".json" @change="handleImport" class="hidden" />
+    </div>
+
+    <!-- Rules List -->
+    <div v-if="activeProfile" class="flex-1 overflow-auto p-3">
+      <div class="space-y-2">
+        <div
+          v-for="(rule, index) in activeProfile.rules"
+          :key="rule.id"
+          draggable="true"
+          @dragstart="onDragStart($event, index)"
+          @dragover.prevent
+          @drop="onDrop($event, index)"
+          :class="['flex items-center gap-3 p-3 bg-white rounded border hover:shadow-sm', selectedRules.has(rule.id) && 'ring-2 ring-blue-400']"
+        >
+          <input
+            type="checkbox"
+            :checked="selectedRules.has(rule.id)"
+            @change="toggleSelectRule(rule.id)"
+            class="w-4 h-4 rounded"
+          >
+          <button
+            @click="toggleRule(rule.id)"
+            :class="['w-10 h-5 rounded-full transition-colors relative flex-shrink-0', rule.enabled ? 'bg-green-500' : 'bg-gray-300']"
+            title="Enable/Disable"
+          >
+            <span :class="['absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', rule.enabled ? 'translate-x-5' : 'translate-x-0']"></span>
+          </button>
+          <div class="flex-1 min-w-0">
+            <div class="font-medium break-all">{{ rule.name }}</div>
+            <div class="text-sm text-gray-500 break-all">
+              {{ rule.headerName }}: {{ rule.action !== 'remove' ? rule.headerValue : '(removed)' }}
+            </div>
+            <div class="text-xs text-gray-400 mt-1 break-all">
+              {{ rule.urlPattern }} · {{ rule.methods.join(', ') || 'ALL' }} · {{ rule.target }}
+            </div>
+          </div>
+          <button
+            @click="editRule(rule)"
+            class="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
+          >
+            Edit
+          </button>
+          <button
+            @click="deleteRule(rule.id)"
+            class="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
+          >
+            Delete
+          </button>
+        </div>
+      </div>
+    </div>
+
+    <!-- Profile List (when no profile selected) -->
+    <div v-else class="flex-1 overflow-auto p-3">
+      <div class="space-y-2">
+        <div
+          v-for="profile in profiles"
+          :key="profile.id"
+          class="flex items-center gap-3 p-3 bg-white rounded border hover:shadow-sm"
+        >
+          <div class="flex-1 min-w-0">
+            <div class="font-medium break-all">{{ profile.name }}</div>
+            <div class="text-sm text-gray-500">{{ profile.rules.length }} rules</div>
+          </div>
+          <button
+            @click="selectProfile(profile.id)"
+            class="px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200"
+          >
+            Select
+          </button>
+          <button
+            @click="editProfile(profile)"
+            class="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
+          >
+            Edit
+          </button>
+          <button
+            @click="deleteProfile(profile.id)"
+            class="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
+          >
+            Delete
+          </button>
+        </div>
+      </div>
+      <div v-if="profiles.length === 0" class="text-center text-gray-500 py-8">
+        No profiles. Click "New Profile" to create one.
+      </div>
+    </div>
+
+    <!-- New Profile Modal -->
+    <div v-if="showNewProfileModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showNewProfileModal = false">
+      <div class="bg-white rounded-lg p-4 w-80">
+        <h3 class="text-lg font-semibold mb-3">New Profile</h3>
+        <input
+          v-model="newProfileName"
+          type="text"
+          placeholder="Profile name"
+          class="w-full px-3 py-2 border rounded mb-3"
+        />
+        <div class="flex justify-end gap-2">
+          <button @click="showNewProfileModal = false" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
+          <button @click="createProfile" class="px-3 py-1.5 bg-blue-500 text-white rounded">Create</button>
+        </div>
+      </div>
+    </div>
+
+    <!-- Edit Profile Modal -->
+    <div v-if="editingProfile" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="editingProfile = null">
+      <div class="bg-white rounded-lg p-4 w-80">
+        <h3 class="text-lg font-semibold mb-3">Edit Profile</h3>
+        <input
+          v-model="editingProfileName"
+          type="text"
+          placeholder="Profile name"
+          class="w-full px-3 py-2 border rounded mb-3"
+        />
+        <div class="flex justify-end gap-2">
+          <button @click="editingProfile = null" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
+          <button @click="saveProfileName" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
+        </div>
+      </div>
+    </div>
+
+    <!-- New/Edit Rule Modal -->
+    <div v-if="showNewRuleModal || editingRule" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeRuleModal">
+      <div class="bg-white rounded-lg p-4 w-[400px]">
+        <h3 class="text-lg font-semibold mb-3">{{ editingRule ? 'Edit Rule' : 'New Rule' }}</h3>
+
+        <div class="space-y-3">
+          <div>
+            <label class="block text-sm font-medium mb-1">Rule Name</label>
+            <input v-model="ruleForm.name" type="text" class="w-full px-3 py-2 border rounded" />
+          </div>
+
+          <div>
+            <label class="block text-sm font-medium mb-1">URL Pattern</label>
+            <div class="flex items-center gap-2">
+              <input v-model="ruleForm.urlPattern" type="text" placeholder="*://api.example.com/*" class="flex-1 px-3 py-2 border rounded" />
+              <button
+                type="button"
+                @click="showPatternTestModal = true"
+                class="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded"
+                title="Test URL Pattern"
+              >
+                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
+                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
+                </svg>
+              </button>
+            </div>
+          </div>
+
+          <div>
+            <label class="block text-sm font-medium mb-1">HTTP Methods</label>
+            <div class="flex flex-wrap gap-2">
+              <label v-for="m in ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']" :key="m" class="flex items-center gap-1">
+                <input type="checkbox" :value="m" v-model="ruleForm.methods" />
+                <span class="text-sm">{{ m }}</span>
+              </label>
+            </div>
+          </div>
+
+          <div class="flex gap-3">
+            <div class="flex-1">
+              <label class="block text-sm font-medium mb-1">Target</label>
+              <select v-model="ruleForm.target" class="w-full px-3 py-2 border rounded">
+                <option value="request">Request Header</option>
+                <option value="response">Response Header</option>
+              </select>
+            </div>
+            <div class="flex-1">
+              <label class="block text-sm font-medium mb-1">Action</label>
+              <select v-model="ruleForm.action" class="w-full px-3 py-2 border rounded">
+                <option value="add">Add</option>
+                <option value="modify">Modify</option>
+                <option value="remove">Remove</option>
+              </select>
+            </div>
+          </div>
+
+          <div>
+            <label class="block text-sm font-medium mb-1">Header Name</label>
+            <input v-model="ruleForm.headerName" type="text" placeholder="Authorization" class="w-full px-3 py-2 border rounded" />
+          </div>
+
+          <div v-if="ruleForm.action !== 'remove'">
+            <label class="block text-sm font-medium mb-1">Header Value</label>
+            <input v-model="ruleForm.headerValue" type="text" placeholder="Bearer token123" class="w-full px-3 py-2 border rounded" />
+          </div>
+        </div>
+
+        <div class="flex justify-end gap-2 mt-4">
+          <button @click="closeRuleModal" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
+          <button @click="saveRule" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
+        </div>
+      </div>
+    </div>
+
+    <!-- Batch Actions Bar (bottom) -->
+    <div v-if="activeProfile" class="p-4 bg-gray-50 border-t flex gap-2 flex-shrink-0">
+      <span class="text-sm text-gray-500 self-center mr-4">{{ selectedRules.size }} selected</span>
+      <button @click="batchDelete" :disabled="selectedRules.size === 0" class="px-4 py-2 bg-chrome-red text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
+        Delete
+      </button>
+      <button @click="selectedRules.clear()" :disabled="selectedRules.size === 0" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">
+        Clear
+      </button>
+    </div>
+
+    <!-- Confirm Modal -->
+    <div v-if="confirmModal.show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
+      <div class="bg-white rounded-lg p-4 w-80">
+        <h3 class="text-lg font-semibold mb-3">{{ confirmModal.title }}</h3>
+        <p class="text-sm text-gray-600 mb-4">{{ confirmModal.message }}</p>
+        <div class="flex justify-end gap-2">
+          <button @click="confirmModal.onCancel" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
+          <button @click="confirmModal.onConfirm" class="px-4 py-2 bg-chrome-red text-white rounded-lg hover:bg-red-600">Delete</button>
+        </div>
+      </div>
+    </div>
+
+    <!-- Pattern Test Modal -->
+    <div v-if="showPatternTestModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showPatternTestModal = false">
+      <div class="bg-white rounded-lg p-4 w-[450px]">
+        <h3 class="text-lg font-semibold mb-3">Test URL Pattern</h3>
+        <div class="mb-3">
+          <label class="block text-sm font-medium mb-1 text-gray-600">Pattern</label>
+          <div class="px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all">{{ ruleForm.urlPattern }}</div>
+        </div>
+        <div class="mb-3">
+          <label class="block text-sm font-medium mb-1">Test URL</label>
+          <input
+            v-model="patternTestUrl"
+            type="text"
+            placeholder="https://api.example.com/v1/users"
+            class="w-full px-3 py-2 border rounded"
+          />
+        </div>
+        <div class="mb-4">
+          <label class="block text-sm font-medium mb-1">Result</label>
+          <div class="px-3 py-2 bg-gray-50 rounded text-sm break-all">
+            <template v-if="patternTestUrl">
+              <span v-if="patternTestResult.matched" class="text-green-600">
+                ✓ Matched
+              </span>
+              <span v-else class="text-red-600">
+                ✗ Not matched
+              </span>
+              <div v-if="patternTestResult.displayUrl" class="mt-2 font-mono">
+                <span v-for="(part, idx) in patternTestResult.parts" :key="idx">
+                  <span :class="part.matched ? 'bg-green-200 text-green-800' : 'text-gray-600'">{{ part.text }}</span>
+                </span>
+              </div>
+            </template>
+            <span v-else class="text-gray-400">Enter a URL to test</span>
+          </div>
+        </div>
+        <div class="flex justify-end">
+          <button @click="showPatternTestModal = false" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Close</button>
+        </div>
+      </div>
+    </div>
+
+    <div v-if="message" class="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
+      <div :class="['p-3 rounded-lg shadow-lg text-sm', messageClass]">
+        {{ message }}
+      </div>
+    </div>
+  </div>
+</template>
+
+<script setup lang="ts">
+import { ref, computed, onMounted, watch } from 'vue'
+import { useHeaderRuleStore } from '@/stores/headerRuleStore'
+import type { HeaderRule, HeaderProfile, HttpMethod, HeaderTarget, HeaderAction } from '@/types'
+
+const store = useHeaderRuleStore()
+
+const selectedProfileId = ref<string | null>(null)
+const showNewProfileModal = ref(false)
+const showNewRuleModal = ref(false)
+const editingRule = ref<HeaderRule | null>(null)
+const editingProfile = ref<HeaderProfile | null>(null)
+const editingProfileName = ref('')
+const newProfileName = ref('')
+const message = ref('')
+const messageType = ref<'success' | 'error'>('success')
+const fileInput = ref<HTMLInputElement | null>(null)
+
+const draggedIndex = ref<number | null>(null)
+const selectedRules = ref<Set<string>>(new Set())
+
+const confirmModal = ref<{
+  show: boolean
+  title: string
+  message: string
+  onConfirm: () => void
+  onCancel: () => void
+}>({
+  show: false,
+  title: '',
+  message: '',
+  onConfirm: () => {},
+  onCancel: () => {}
+})
+
+const showPatternTestModal = ref(false)
+const patternTestUrl = ref('')
+
+interface PatternTestPart {
+  text: string
+  matched: boolean
+}
+
+const patternTestResult = computed(() => {
+  const pattern = ruleForm.value.urlPattern
+  const url = patternTestUrl.value
+
+  if (!url) {
+    return { matched: false, displayUrl: '', parts: [] as PatternTestPart[] }
+  }
+
+  const result = matchPattern(pattern, url)
+  const parts: PatternTestPart[] = []
+
+  if (result.matched && result.matchedParts) {
+    let lastEnd = 0
+    for (const part of result.matchedParts) {
+      if (part.start > lastEnd) {
+        parts.push({ text: url.slice(lastEnd, part.start), matched: false })
+      }
+      parts.push({ text: url.slice(part.start, part.end), matched: true })
+      lastEnd = part.end
+    }
+    if (lastEnd < url.length) {
+      parts.push({ text: url.slice(lastEnd), matched: false })
+    }
+  } else {
+    parts.push({ text: url, matched: false })
+  }
+
+  return { matched: result.matched, displayUrl: url, parts }
+})
+
+function matchPattern(pattern: string, url: string): { matched: boolean; matchedParts?: { start: number; end: number }[] } {
+  try {
+    const urlObj = new URL(url)
+    const [scheme, hostPath] = pattern.split('://')
+    const [hostPattern, ...pathParts] = hostPath.split('/')
+    const pathPattern = '/' + pathParts.join('/')
+
+    // Check scheme
+    if (scheme !== '*' && scheme !== urlObj.protocol.replace(':', '')) {
+      return { matched: false }
+    }
+
+    // Check host
+    const hostname = urlObj.hostname
+    let hostMatched = false
+
+    if (hostPattern === '*') {
+      hostMatched = true
+    } else if (hostPattern.startsWith('*.')) {
+      const domain = hostPattern.slice(2)
+      hostMatched = hostname === domain || hostname.endsWith('.' + domain)
+    } else {
+      hostMatched = hostPattern === hostname
+    }
+
+    if (!hostMatched) {
+      return { matched: false }
+    }
+
+    // Check path
+    const path = urlObj.pathname
+    let pathMatched = false
+
+    if (pathPattern === '/*' || pathPattern === '/') {
+      pathMatched = true
+    } else if (pathPattern.includes('*')) {
+      const regexStr = pathPattern.replace(/\*/g, '.*')
+      const regex = new RegExp('^' + regexStr + '$')
+      pathMatched = regex.test(path)
+    } else {
+      pathMatched = path === pathPattern
+    }
+
+    if (!pathMatched) {
+      return { matched: false }
+    }
+
+    // Build matched parts (host + path)
+    const matchedParts: { start: number; end: number }[] = []
+
+    // Find host position in URL
+    const hostStart = url.indexOf(hostname)
+    if (hostStart !== -1) {
+      matchedParts.push({ start: hostStart, end: hostStart + hostname.length })
+    }
+
+    // Find path position in URL
+    const pathStart = url.indexOf(path)
+    if (pathStart !== -1 && pathStart !== hostStart) {
+      matchedParts.push({ start: pathStart, end: pathStart + path.length })
+    }
+
+    return { matched: true, matchedParts }
+  } catch {
+    return { matched: false }
+  }
+}
+
+const profiles = computed(() => store.profiles)
+const activeProfile = computed(() => store.activeProfile)
+
+const ruleForm = ref({
+  name: '',
+  urlPattern: '*://*/*',
+  methods: ['ALL'] as HttpMethod[],
+  target: 'request' as HeaderTarget,
+  action: 'add' as HeaderAction,
+  headerName: '',
+  headerValue: ''
+})
+
+const messageClass = computed(() =>
+  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
+)
+
+function showMessage(text: string, type: 'success' | 'error' = 'success') {
+  message.value = text
+  messageType.value = type
+  setTimeout(() => { message.value = '' }, 3000)
+}
+
+function showConfirm(title: string, message: string, onConfirm: () => void) {
+  confirmModal.value = {
+    show: true,
+    title,
+    message,
+    onConfirm: () => {
+      confirmModal.value.show = false
+      onConfirm()
+    },
+    onCancel: () => {
+      confirmModal.value.show = false
+    }
+  }
+}
+
+function handleProfileChange() {
+  store.setActiveProfile(selectedProfileId.value)
+}
+
+async function createProfile() {
+  if (!newProfileName.value.trim()) {
+    showMessage('Please enter a profile name', 'error')
+    return
+  }
+  await store.createProfile(newProfileName.value.trim())
+  newProfileName.value = ''
+  showNewProfileModal.value = false
+  showMessage('Profile created')
+}
+
+function selectProfile(profileId: string) {
+  selectedProfileId.value = profileId
+  store.setActiveProfile(profileId)
+}
+
+function editProfile(profile: HeaderProfile) {
+  editingProfile.value = profile
+  editingProfileName.value = profile.name
+}
+
+async function saveProfileName() {
+  if (!editingProfile.value) return
+  if (!editingProfileName.value.trim()) {
+    showMessage('Please enter a profile name', 'error')
+    return
+  }
+  await store.updateProfile(editingProfile.value.id, { name: editingProfileName.value.trim() })
+  editingProfile.value = null
+  showMessage('Profile updated')
+}
+
+async function deleteProfile(profileId: string) {
+  const profile = profiles.value.find(p => p.id === profileId)
+  if (!profile) return
+
+  if (profile.rules.length > 0) {
+    showConfirm(
+      'Delete Profile',
+      `Delete "${profile.name}" and its ${profile.rules.length} rules?`,
+      async () => {
+        await store.deleteProfile(profileId)
+        if (selectedProfileId.value === profileId) {
+          selectedProfileId.value = null
+        }
+        showMessage('Profile deleted')
+      }
+    )
+  } else {
+    await store.deleteProfile(profileId)
+    if (selectedProfileId.value === profileId) {
+      selectedProfileId.value = null
+    }
+    showMessage('Profile deleted')
+  }
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
+function toggleSelectRule(ruleId: string) {
+  if (selectedRules.value.has(ruleId)) {
+    selectedRules.value.delete(ruleId)
+  } else {
+    selectedRules.value.add(ruleId)
+  }
+}
+
+async function batchDelete() {
+  if (!activeProfile.value || selectedRules.value.size === 0) return
+  showConfirm(
+    'Delete Rules',
+    `Delete ${selectedRules.value.size} selected rules?`,
+    async () => {
+      for (const ruleId of selectedRules.value) {
+        await store.deleteRule(activeProfile.value!.id, ruleId)
+      }
+      selectedRules.value.clear()
+      showMessage('Selected rules deleted')
+    }
+  )
+}
+
+function editRule(rule: HeaderRule) {
+  editingRule.value = rule
+  ruleForm.value = {
+    name: rule.name,
+    urlPattern: rule.urlPattern,
+    methods: [...rule.methods],
+    target: rule.target,
+    action: rule.action,
+    headerName: rule.headerName,
+    headerValue: rule.headerValue
+  }
+}
+
+async function deleteRule(ruleId: string) {
+  if (!activeProfile.value) return
+  showConfirm(
+    'Delete Rule',
+    'Delete this rule?',
+    async () => {
+      await store.deleteRule(activeProfile.value!.id, ruleId)
+      showMessage('Rule deleted')
+    }
+  )
+}
+
+function closeRuleModal() {
+  showNewRuleModal.value = false
+  editingRule.value = null
+  resetRuleForm()
+}
+
+function resetRuleForm() {
+  ruleForm.value = {
+    name: '',
+    urlPattern: '*://*/*',
+    methods: ['ALL'],
+    target: 'request',
+    action: 'add',
+    headerName: '',
+    headerValue: ''
+  }
+}
+
+async function saveRule() {
+  if (!activeProfile.value) {
+    showMessage('Please select a profile first', 'error')
+    return
+  }
+  if (!ruleForm.value.name || !ruleForm.value.headerName) {
+    showMessage('Name and Header Name are required', 'error')
+    return
+  }
+
+  try {
+    const ruleData: HeaderRule = {
+      id: editingRule.value?.id ?? `rule-${Date.now()}`,
+      enabled: editingRule.value?.enabled ?? true,
+      name: ruleForm.value.name,
+      urlPattern: ruleForm.value.urlPattern,
+      methods: ruleForm.value.methods,
+      action: ruleForm.value.action,
+      headerName: ruleForm.value.headerName,
+      headerValue: ruleForm.value.headerValue,
+      target: ruleForm.value.target
+    }
+
+    if (editingRule.value) {
+      await store.updateRule(activeProfile.value.id, editingRule.value.id, ruleData)
+      showMessage('Rule updated')
+    } else {
+      await store.addRule(activeProfile.value.id, ruleData)
+      showMessage('Rule created')
+    }
+
+    closeRuleModal()
+  } catch (e) {
+    console.error('saveRule error:', e)
+    showMessage('Failed to save rule: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
+  }
+}
+
+function onDragStart(_e: DragEvent, index: number) {
+  draggedIndex.value = index
+}
+
+function onDrop(_e: DragEvent, dropIndex: number) {
+  if (!activeProfile.value || draggedIndex.value === null) return
+
+  const ruleIds = [...activeProfile.value.rules.map(r => r.id)]
+  const [removed] = ruleIds.splice(draggedIndex.value, 1)
+  ruleIds.splice(dropIndex, 0, removed)
+
+  store.reorderRules(activeProfile.value.id, ruleIds)
+  draggedIndex.value = null
+}
+
+async function handleExport() {
+  const response = await chrome.runtime.sendMessage({ action: 'exportHeaderProfiles' })
+  if (response?.success && response?.data) {
+    const blob = new Blob([response.data], { type: 'application/json' })
+    const url = URL.createObjectURL(blob)
+    const a = document.createElement('a')
+    a.href = url
+    a.download = `header-profiles-${Date.now()}.json`
+    a.click()
+    URL.revokeObjectURL(url)
+    showMessage('Profiles exported')
+  }
+}
+
+function triggerImport() {
+  fileInput.value?.click()
+}
+
+async function handleImport(e: Event) {
+  const file = (e.target as HTMLInputElement).files?.[0]
+  if (!file) return
+
+  const text = await file.text()
+  const response = await chrome.runtime.sendMessage({
+    action: 'importHeaderProfiles',
+    jsonString: text
+  })
+
+  if (response?.success) {
+    await store.loadProfiles()
+    showMessage('Profiles imported')
+  } else {
+    showMessage(response?.error || 'Import failed', 'error')
+  }
+
+  if (fileInput.value) fileInput.value.value = ''
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
\ No newline at end of file
