# Task 12 Review Package

## Commit History
```
4f24877 feat: add variable management to SettingsPanel
```

## Diff Stats
```
 src/devtools/components/SettingsPanel.vue | 220 +++++++++++++++++++++++++++++-
 1 file changed, 219 insertions(+), 1 deletion(-)
```

## Full Diff
diff --git a/src/devtools/components/SettingsPanel.vue b/src/devtools/components/SettingsPanel.vue
index 426eba9..8b7716e 100644
--- a/src/devtools/components/SettingsPanel.vue
+++ b/src/devtools/components/SettingsPanel.vue
@@ -12,41 +12,259 @@
       </label>
     </div>
     <div class="flex items-center justify-between">
       <div>
         <div class="font-medium">Max Clipboard Items</div>
         <div class="text-sm text-gray-500">Maximum saved clipboard items</div>
       </div>
       <input v-model.number="maxItems" type="number" min="1" max="50"
         class="w-20 px-2 py-1 border rounded" @change="handleMaxItemsChange" />
     </div>
+
+    <!-- Variables Section -->
+    <div class="pt-4 border-t">
+      <h4 class="font-medium mb-3">Variables</h4>
+
+      <!-- Preset Variables -->
+      <div class="mb-4">
+        <div class="flex items-center justify-between mb-2">
+          <span class="text-sm text-gray-600">Preset Variables</span>
+          <button @click="openPresetModal()" class="text-xs px-2 py-1 bg-chrome-blue text-white rounded hover:bg-blue-600">
+            + Add
+          </button>
+        </div>
+        <div v-if="variableStore.presetVariables.length === 0" class="text-sm text-gray-400 py-2">
+          No preset variables
+        </div>
+        <div v-else class="space-y-2">
+          <div v-for="variable in variableStore.presetVariables" :key="variable.name"
+            class="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
+            <div class="flex-1 min-w-0">
+              <div class="font-medium text-sm truncate">{{ variable.name }}</div>
+              <div class="text-xs text-gray-500 truncate">{{ variable.value }}</div>
+            </div>
+            <div class="flex gap-1 ml-2">
+              <button @click="openPresetModal(variable)" class="text-xs px-2 py-1 text-gray-600 hover:bg-gray-200 rounded">
+                Edit
+              </button>
+              <button @click="deletePresetVariable(variable.name)" class="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">
+                Delete
+              </button>
+            </div>
+          </div>
+        </div>
+      </div>
+
+      <!-- Auto-Extract Variables -->
+      <div>
+        <div class="flex items-center justify-between mb-2">
+          <span class="text-sm text-gray-600">Auto-Extract Variables</span>
+          <button @click="openAutoExtractModal()" class="text-xs px-2 py-1 bg-chrome-blue text-white rounded hover:bg-blue-600">
+            + Add
+          </button>
+        </div>
+        <div v-if="variableStore.autoExtractVariables.length === 0" class="text-sm text-gray-400 py-2">
+          No auto-extract variables
+        </div>
+        <div v-else class="space-y-2">
+          <div v-for="variable in variableStore.autoExtractVariables" :key="variable.name"
+            class="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
+            <div class="flex-1 min-w-0">
+              <div class="font-medium text-sm truncate">{{ variable.name }}</div>
+              <div class="text-xs text-gray-500">{{ variable.source }}: {{ variable.key }}</div>
+            </div>
+            <div class="flex gap-1 ml-2">
+              <button @click="deleteAutoExtractVariable(variable.name)" class="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">
+                Delete
+              </button>
+            </div>
+          </div>
+        </div>
+      </div>
+    </div>
+
     <div class="pt-4 border-t">
       <button @click="$emit('close')" class="w-full py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
     </div>
+
+    <!-- Preset Variable Modal -->
+    <div v-if="showPresetModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
+      <div class="bg-white rounded-lg p-4 w-80 space-y-4">
+        <h4 class="font-medium">{{ editingPreset ? 'Edit Preset Variable' : 'Add Preset Variable' }}</h4>
+        <div>
+          <label class="block text-sm text-gray-600 mb-1">Name</label>
+          <input v-model="presetForm.name" type="text" placeholder="variableName"
+            class="w-full px-3 py-2 border rounded" :disabled="!!editingPreset" />
+        </div>
+        <div>
+          <label class="block text-sm text-gray-600 mb-1">Value</label>
+          <input v-model="presetForm.value" type="text" placeholder="value"
+            class="w-full px-3 py-2 border rounded" />
+        </div>
+        <div>
+          <label class="block text-sm text-gray-600 mb-1">Description (optional)</label>
+          <input v-model="presetForm.description" type="text" placeholder="Description"
+            class="w-full px-3 py-2 border rounded" />
+        </div>
+        <div class="flex gap-2 justify-end">
+          <button @click="closePresetModal" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
+            Cancel
+          </button>
+          <button @click="savePresetVariable" class="px-4 py-2 bg-chrome-blue text-white rounded hover:bg-blue-600">
+            Save
+          </button>
+        </div>
+      </div>
+    </div>
+
+    <!-- Auto-Extract Variable Modal -->
+    <div v-if="showAutoExtractModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
+      <div class="bg-white rounded-lg p-4 w-80 space-y-4">
+        <h4 class="font-medium">Add Auto-Extract Variable</h4>
+        <div>
+          <label class="block text-sm text-gray-600 mb-1">Variable Name</label>
+          <input v-model="autoExtractForm.name" type="text" placeholder="variableName"
+            class="w-full px-3 py-2 border rounded" />
+        </div>
+        <div>
+          <label class="block text-sm text-gray-600 mb-1">Source</label>
+          <select v-model="autoExtractForm.source" class="w-full px-3 py-2 border rounded">
+            <option value="localStorage">localStorage</option>
+            <option value="sessionStorage">sessionStorage</option>
+            <option value="cookie">Cookie</option>
+            <option value="meta">Meta Tag</option>
+          </select>
+        </div>
+        <div>
+          <label class="block text-sm text-gray-600 mb-1">Key</label>
+          <input v-model="autoExtractForm.key" type="text" placeholder="storageKey"
+            class="w-full px-3 py-2 border rounded" />
+        </div>
+        <div class="flex gap-2 justify-end">
+          <button @click="closeAutoExtractModal" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
+            Cancel
+          </button>
+          <button @click="saveAutoExtractVariable" class="px-4 py-2 bg-chrome-blue text-white rounded hover:bg-blue-600">
+            Save
+          </button>
+        </div>
+      </div>
+    </div>
   </div>
 </template>
 
 <script setup lang="ts">
-import { ref, onMounted } from 'vue'
+import { ref, reactive, onMounted } from 'vue'
 import { useSettingStore } from '@/stores/settingStore'
+import { useVariableStore } from '@/stores/variableStore'
+import type { PresetVariable } from '@/types'
 
 defineEmits<{ close: [] }>()
 const settingStore = useSettingStore()
+const variableStore = useVariableStore()
 const persistMode = ref(false)
 const maxItems = ref(10)
 
+// Preset Variable Modal State
+const showPresetModal = ref(false)
+const editingPreset = ref<PresetVariable | null>(null)
+const presetForm = reactive({ name: '', value: '', description: '' })
+
+// Auto-Extract Variable Modal State
+const showAutoExtractModal = ref(false)
+const autoExtractForm = reactive({ name: '', source: 'localStorage' as const, key: '' })
+
 onMounted(async () => {
   await settingStore.load()
   persistMode.value = settingStore.persistMode
   maxItems.value = settingStore.maxClipboardItems
+  await variableStore.loadVariables()
 })
 
 async function handlePersistChange() {
   settingStore.updateSettings({ persistMode: persistMode.value })
   await settingStore.save()
 }
 
 async function handleMaxItemsChange() {
   settingStore.updateSettings({ maxClipboardItems: maxItems.value })
   await settingStore.save()
 }
+
+// Preset Variable Functions
+function openPresetModal(variable?: PresetVariable) {
+  if (variable) {
+    editingPreset.value = variable
+    presetForm.name = variable.name
+    presetForm.value = variable.value
+    presetForm.description = variable.description || ''
+  } else {
+    editingPreset.value = null
+    presetForm.name = ''
+    presetForm.value = ''
+    presetForm.description = ''
+  }
+  showPresetModal.value = true
+}
+
+function closePresetModal() {
+  showPresetModal.value = false
+  editingPreset.value = null
+}
+
+async function savePresetVariable() {
+  if (!presetForm.name.trim() || !presetForm.value.trim()) {
+    return
+  }
+
+  if (editingPreset.value) {
+    await variableStore.updatePresetVariable(editingPreset.value.name, {
+      value: presetForm.value,
+      description: presetForm.description || undefined
+    })
+  } else {
+    await variableStore.addPresetVariable({
+      name: presetForm.name.trim(),
+      value: presetForm.value,
+      description: presetForm.description || undefined
+    })
+  }
+  closePresetModal()
+}
+
+async function deletePresetVariable(name: string) {
+  if (confirm(`Delete preset variable "${name}"?`)) {
+    await variableStore.deletePresetVariable(name)
+  }
+}
+
+// Auto-Extract Variable Functions
+function openAutoExtractModal() {
+  autoExtractForm.name = ''
+  autoExtractForm.source = 'localStorage'
+  autoExtractForm.key = ''
+  showAutoExtractModal.value = true
+}
+
+function closeAutoExtractModal() {
+  showAutoExtractModal.value = false
+}
+
+async function saveAutoExtractVariable() {
+  if (!autoExtractForm.name.trim() || !autoExtractForm.key.trim()) {
+    return
+  }
+
+  await variableStore.addAutoExtractVariable({
+    name: autoExtractForm.name.trim(),
+    source: autoExtractForm.source,
+    key: autoExtractForm.key.trim()
+  })
+  closeAutoExtractModal()
+}
+
+async function deleteAutoExtractVariable(name: string) {
+  if (confirm(`Delete auto-extract variable "${name}"?`)) {
+    await variableStore.deleteAutoExtractVariable(name)
+  }
+}
 </script>
