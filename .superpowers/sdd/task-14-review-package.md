# Task 14 Review Package

## Commit History
```
42a556c feat: refactor rule editor with Headers/Body tabs
```

## Diff Stats
```
 src/manager/components/RequestRewriteManager.vue | 155 ++++++++++++++++-------
 1 file changed, 111 insertions(+), 44 deletions(-)
```

## Full Diff
diff --git a/src/manager/components/RequestRewriteManager.vue b/src/manager/components/RequestRewriteManager.vue
index e9f6b2d..1a9c032 100644
--- a/src/manager/components/RequestRewriteManager.vue
+++ b/src/manager/components/RequestRewriteManager.vue
@@ -52,21 +52,21 @@
           <button
             @click="toggleRule(rule.id)"
             :class="['w-10 h-5 rounded-full transition-colors relative flex-shrink-0', rule.enabled ? 'bg-green-500' : 'bg-gray-300']"
             title="Enable/Disable"
           >
             <span :class="['absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', rule.enabled ? 'translate-x-5' : 'translate-x-0']"></span>
           </button>
           <div class="flex-1 min-w-0">
             <div class="font-medium break-all">{{ rule.name }}</div>
             <div class="text-sm text-gray-500 break-all">
-              {{ rule.headerName }}: {{ rule.action !== 'remove' ? rule.headerValue : '(removed)' }}
+              {{ rule.headers.length }} header(s), {{ rule.bodyRewrites.length }} body rewrite(s)
             </div>
             <div class="text-xs text-gray-400 mt-1 break-all">
               {{ rule.urlPattern }} · {{ rule.methods.join(', ') || 'ALL' }} · {{ rule.target }}
             </div>
           </div>
           <button
             @click="editRule(rule)"
             class="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
           >
             Edit
@@ -147,21 +147,21 @@
         />
         <div class="flex justify-end gap-2">
           <button @click="editingProfile = null" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
           <button @click="saveProfileName" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
         </div>
       </div>
     </div>
 
     <!-- New/Edit Rule Modal -->
     <div v-if="showNewRuleModal || editingRule" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeRuleModal">
-      <div class="bg-white rounded-lg p-4 w-[400px]">
+      <div class="bg-white rounded-lg p-4 w-[500px] max-h-[80vh] overflow-y-auto">
         <h3 class="text-lg font-semibold mb-3">{{ editingRule ? 'Edit Rule' : 'New Rule' }}</h3>
 
         <div class="space-y-3">
           <div>
             <label class="block text-sm font-medium mb-1">Rule Name</label>
             <input v-model="ruleForm.name" type="text" class="w-full px-3 py-2 border rounded" />
           </div>
 
           <div>
             <label class="block text-sm font-medium mb-1">URL Pattern</label>
@@ -183,46 +183,104 @@
           <div>
             <label class="block text-sm font-medium mb-1">HTTP Methods</label>
             <div class="flex flex-wrap gap-2">
               <label v-for="m in ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']" :key="m" class="flex items-center gap-1">
                 <input type="checkbox" :value="m" v-model="ruleForm.methods" />
                 <span class="text-sm">{{ m }}</span>
               </label>
             </div>
           </div>
 
-          <div class="flex gap-3">
-            <div class="flex-1">
-              <label class="block text-sm font-medium mb-1">Target</label>
-              <select v-model="ruleForm.target" class="w-full px-3 py-2 border rounded">
-                <option value="request">Request Header</option>
-                <option value="response">Response Header</option>
-              </select>
-            </div>
-            <div class="flex-1">
-              <label class="block text-sm font-medium mb-1">Action</label>
-              <select v-model="ruleForm.action" class="w-full px-3 py-2 border rounded">
+          <div>
+            <label class="block text-sm font-medium mb-1">Target</label>
+            <select v-model="ruleForm.target" class="w-full px-3 py-2 border rounded">
+              <option value="request">Request</option>
+              <option value="response">Response</option>
+            </select>
+          </div>
+
+          <!-- Tab Switcher -->
+          <div class="flex gap-1 bg-gray-100 rounded-lg p-1">
+            <button
+              @click="ruleEditTab = 'headers'"
+              :class="['flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors', ruleEditTab === 'headers' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800']"
+            >
+              Headers ({{ ruleForm.headers.length }})
+            </button>
+            <button
+              @click="ruleEditTab = 'body'"
+              :class="['flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors', ruleEditTab === 'body' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800']"
+            >
+              Body ({{ ruleForm.bodyRewrites.length }})
+            </button>
+          </div>
+
+          <!-- Headers Tab -->
+          <div v-show="ruleEditTab === 'headers'" class="space-y-2">
+            <div v-for="(header, idx) in ruleForm.headers" :key="idx" class="flex gap-2 items-start p-2 bg-gray-50 rounded">
+              <select v-model="header.action" class="px-2 py-1.5 border rounded text-sm w-20">
                 <option value="add">Add</option>
                 <option value="modify">Modify</option>
                 <option value="remove">Remove</option>
               </select>
+              <input v-model="header.headerName" type="text" placeholder="Header Name" class="flex-1 px-2 py-1.5 border rounded text-sm" />
+              <input v-if="header.action !== 'remove'" v-model="header.headerValue" type="text" placeholder="Value" class="flex-1 px-2 py-1.5 border rounded text-sm" />
+              <button @click="ruleForm.headers.splice(idx, 1)" :disabled="ruleForm.headers.length === 1" class="px-2 py-1.5 text-red-500 hover:text-red-700 disabled:opacity-30">
+                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
+                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
+                </svg>
+              </button>
             </div>
+            <button @click="ruleForm.headers.push({ action: 'add', headerName: '', headerValue: '' })" class="w-full px-3 py-1.5 border border-dashed rounded text-sm text-gray-500 hover:text-blue-500 hover:border-blue-300">
+              + Add Header Action
+            </button>
           </div>
 
-          <div>
-            <label class="block text-sm font-medium mb-1">Header Name</label>
-            <input v-model="ruleForm.headerName" type="text" placeholder="Authorization" class="w-full px-3 py-2 border rounded" />
-          </div>
-
-          <div v-if="ruleForm.action !== 'remove'">
-            <label class="block text-sm font-medium mb-1">Header Value</label>
-            <input v-model="ruleForm.headerValue" type="text" placeholder="Bearer token123" class="w-full px-3 py-2 border rounded" />
+          <!-- Body Tab -->
+          <div v-show="ruleEditTab === 'body'" class="space-y-2">
+            <div v-for="(rewrite, idx) in ruleForm.bodyRewrites" :key="idx" class="p-3 bg-gray-50 rounded space-y-2">
+              <div class="flex gap-2 items-center">
+                <select v-model="rewrite.method" class="px-2 py-1.5 border rounded text-sm w-28">
+                  <option value="text">Text</option>
+                  <option value="jsonPath">JSON Path</option>
+                  <option value="regex">Regex</option>
+                  <option value="script">Script</option>
+                </select>
+                <button @click="ruleForm.bodyRewrites.splice(idx, 1)" class="px-2 py-1.5 text-red-500 hover:text-red-700 ml-auto">
+                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
+                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
+                  </svg>
+                </button>
+              </div>
+              <!-- Text method -->
+              <template v-if="rewrite.method === 'text'">
+                <input v-model="rewrite.find" type="text" placeholder="Find" class="w-full px-2 py-1.5 border rounded text-sm" />
+                <input v-model="rewrite.replace" type="text" placeholder="Replace" class="w-full px-2 py-1.5 border rounded text-sm" />
+              </template>
+              <!-- JSON Path method -->
+              <template v-else-if="rewrite.method === 'jsonPath'">
+                <input v-model="rewrite.path" type="text" placeholder="$.path.to.field" class="w-full px-2 py-1.5 border rounded text-sm" />
+                <input v-model="rewrite.value" type="text" placeholder="New value" class="w-full px-2 py-1.5 border rounded text-sm" />
+              </template>
+              <!-- Regex method -->
+              <template v-else-if="rewrite.method === 'regex'">
+                <input v-model="rewrite.pattern" type="text" placeholder="Pattern (e.g. /\d+/g)" class="w-full px-2 py-1.5 border rounded text-sm" />
+                <input v-model="rewrite.replacement" type="text" placeholder="Replacement" class="w-full px-2 py-1.5 border rounded text-sm" />
+              </template>
+              <!-- Script method -->
+              <template v-else-if="rewrite.method === 'script'">
+                <textarea v-model="rewrite.scriptBody" placeholder="// return transformed body&#10;(body) => body.replace(/old/g, 'new')" class="w-full px-2 py-1.5 border rounded text-sm font-mono h-24 resize-y"></textarea>
+              </template>
+            </div>
+            <button @click="addBodyRewrite" class="w-full px-3 py-1.5 border border-dashed rounded text-sm text-gray-500 hover:text-blue-500 hover:border-blue-300">
+              + Add Body Rewrite
+            </button>
           </div>
         </div>
 
         <div class="flex justify-end gap-2 mt-4">
           <button @click="closeRuleModal" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
           <button @click="saveRule" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
         </div>
       </div>
     </div>
 
@@ -294,30 +352,30 @@
     <div v-if="message" class="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
       <div :class="['p-3 rounded-lg shadow-lg text-sm', messageClass]">
         {{ message }}
       </div>
     </div>
   </div>
 </template>
 
 <script setup lang="ts">
 import { ref, computed, onMounted, watch } from 'vue'
-import { useHeaderRuleStore } from '@/stores/headerRuleStore'
-import type { HeaderRule, HeaderProfile, HttpMethod, HeaderTarget, HeaderAction } from '@/types'
+import { useRequestRewriteStore } from '@/stores/requestRewriteStore'
+import type { RequestRewriteRule, RequestRewriteProfile, HttpMethod, HeaderTarget, HeaderRuleAction, BodyRewriteAction } from '@/types'
 
-const store = useHeaderRuleStore()
+const store = useRequestRewriteStore()
 
 const selectedProfileId = ref<string | null>(null)
 const showNewProfileModal = ref(false)
 const showNewRuleModal = ref(false)
-const editingRule = ref<HeaderRule | null>(null)
-const editingProfile = ref<HeaderProfile | null>(null)
+const editingRule = ref<RequestRewriteRule | null>(null)
+const editingProfile = ref<RequestRewriteProfile | null>(null)
 const editingProfileName = ref('')
 const newProfileName = ref('')
 const message = ref('')
 const messageType = ref<'success' | 'error'>('success')
 const fileInput = ref<HTMLInputElement | null>(null)
 
 const draggedIndex = ref<number | null>(null)
 const selectedRules = ref<Set<string>>(new Set())
 
 const confirmModal = ref<{
@@ -441,24 +499,24 @@ function matchPattern(pattern: string, url: string): { matched: boolean; matched
 }
 
 const profiles = computed(() => store.profiles)
 const activeProfile = computed(() => store.activeProfile)
 
 const ruleForm = ref({
   name: '',
   urlPattern: '*://*/*',
   methods: ['ALL'] as HttpMethod[],
   target: 'request' as HeaderTarget,
-  action: 'add' as HeaderAction,
-  headerName: '',
-  headerValue: ''
+  headers: [{ action: 'add' as const, headerName: '', headerValue: '' }] as HeaderRuleAction[],
+  bodyRewrites: [] as BodyRewriteAction[]
 })
+const ruleEditTab = ref<'headers' | 'body'>('headers')
 
 const messageClass = computed(() =>
   messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
 )
 
 function showMessage(text: string, type: 'success' | 'error' = 'success') {
   message.value = text
   messageType.value = type
   setTimeout(() => { message.value = '' }, 3000)
 }
@@ -491,21 +549,21 @@ async function createProfile() {
   newProfileName.value = ''
   showNewProfileModal.value = false
   showMessage('Profile created')
 }
 
 function selectProfile(profileId: string) {
   selectedProfileId.value = profileId
   store.setActiveProfile(profileId)
 }
 
-function editProfile(profile: HeaderProfile) {
+function editProfile(profile: RequestRewriteProfile) {
   editingProfile.value = profile
   editingProfileName.value = profile.name
 }
 
 async function saveProfileName() {
   if (!editingProfile.value) return
   if (!editingProfileName.value.trim()) {
     showMessage('Please enter a profile name', 'error')
     return
   }
@@ -563,31 +621,33 @@ async function batchDelete() {
     async () => {
       for (const ruleId of selectedRules.value) {
         await store.deleteRule(activeProfile.value!.id, ruleId)
       }
       selectedRules.value.clear()
       showMessage('Selected rules deleted')
     }
   )
 }
 
-function editRule(rule: HeaderRule) {
+function editRule(rule: RequestRewriteRule) {
   editingRule.value = rule
   ruleForm.value = {
     name: rule.name,
     urlPattern: rule.urlPattern,
     methods: [...rule.methods],
     target: rule.target,
-    action: rule.action,
-    headerName: rule.headerName,
-    headerValue: rule.headerValue
+    headers: rule.headers.length > 0
+      ? rule.headers.map(h => ({ ...h }))
+      : [{ action: 'add' as const, headerName: '', headerValue: '' }],
+    bodyRewrites: rule.bodyRewrites.map(b => ({ ...b }))
   }
+  ruleEditTab.value = 'headers'
 }
 
 async function deleteRule(ruleId: string) {
   if (!activeProfile.value) return
   showConfirm(
     'Delete Rule',
     'Delete this rule?',
     async () => {
       await store.deleteRule(activeProfile.value!.id, ruleId)
       showMessage('Rule deleted')
@@ -600,64 +660,71 @@ function closeRuleModal() {
   editingRule.value = null
   resetRuleForm()
 }
 
 function resetRuleForm() {
   ruleForm.value = {
     name: '',
     urlPattern: '*://*/*',
     methods: ['ALL'],
     target: 'request',
-    action: 'add',
-    headerName: '',
-    headerValue: ''
+    headers: [{ action: 'add', headerName: '', headerValue: '' }],
+    bodyRewrites: []
   }
+  ruleEditTab.value = 'headers'
 }
 
 async function saveRule() {
   if (!activeProfile.value) {
     showMessage('Please select a profile first', 'error')
     return
   }
-  if (!ruleForm.value.name || !ruleForm.value.headerName) {
-    showMessage('Name and Header Name are required', 'error')
+  if (!ruleForm.value.name) {
+    showMessage('Name is required', 'error')
     return
   }
 
   try {
-    const ruleData: HeaderRule = {
+    const ruleData: RequestRewriteRule = {
       id: editingRule.value?.id ?? `rule-${Date.now()}`,
       enabled: editingRule.value?.enabled ?? true,
       name: ruleForm.value.name,
       urlPattern: ruleForm.value.urlPattern,
       methods: ruleForm.value.methods,
-      action: ruleForm.value.action,
-      headerName: ruleForm.value.headerName,
-      headerValue: ruleForm.value.headerValue,
-      target: ruleForm.value.target
+      target: ruleForm.value.target,
+      headers: ruleForm.value.headers.filter(h => h.headerName.trim() !== ''),
+      bodyRewrites: ruleForm.value.bodyRewrites
     }
 
     if (editingRule.value) {
       await store.updateRule(activeProfile.value.id, editingRule.value.id, ruleData)
       showMessage('Rule updated')
     } else {
       await store.addRule(activeProfile.value.id, ruleData)
       showMessage('Rule created')
     }
 
     closeRuleModal()
   } catch (e) {
     console.error('saveRule error:', e)
     showMessage('Failed to save rule: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
   }
 }
 
+function addBodyRewrite() {
+  ruleForm.value.bodyRewrites.push({
+    method: 'text',
+    find: '',
+    replace: ''
+  })
+}
+
 function onDragStart(_e: DragEvent, index: number) {
   draggedIndex.value = index
 }
 
 function onDrop(_e: DragEvent, dropIndex: number) {
   if (!activeProfile.value || draggedIndex.value === null) return
 
   const ruleIds = [...activeProfile.value.rules.map(r => r.id)]
   const [removed] = ruleIds.splice(draggedIndex.value, 1)
   ruleIds.splice(dropIndex, 0, removed)
