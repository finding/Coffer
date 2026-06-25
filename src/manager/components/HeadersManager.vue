<!-- src/manager/components/HeadersManager.vue -->
<template>
  <div class="flex flex-col h-full">
    <!-- Profile Bar -->
    <div class="flex items-center gap-2 p-3 bg-white border-b">
      <select
        v-model="selectedProfileId"
        @change="handleProfileChange"
        class="px-3 py-1.5 border rounded text-sm"
      >
        <option :value="null">Select Profile</option>
        <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <button @click="showNewProfileModal = true" class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
        New Profile
      </button>
      <button
        v-if="selectedProfileId"
        @click="showNewRuleModal = true"
        class="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
      >
        New Rule
      </button>
      <div class="flex-1"></div>
      <button @click="handleExport" class="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">
        Export
      </button>
      <button @click="triggerImport" class="px-3 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300">
        Import
      </button>
      <input ref="fileInput" type="file" accept=".json" @change="handleImport" class="hidden" />
    </div>

    <!-- Rules List -->
    <div v-if="activeProfile" class="flex-1 overflow-auto p-3">
      <div class="space-y-2">
        <div
          v-for="(rule, index) in activeProfile.rules"
          :key="rule.id"
          draggable="true"
          @dragstart="onDragStart($event, index)"
          @dragover.prevent
          @drop="onDrop($event, index)"
          class="flex items-center gap-3 p-3 bg-white rounded border hover:shadow-sm"
        >
          <input
            type="checkbox"
            :checked="rule.enabled"
            @change="toggleRule(rule.id)"
            class="w-4 h-4"
          >
          <div class="flex-1">
            <div class="font-medium">{{ rule.name }}</div>
            <div class="text-sm text-gray-500">
              {{ rule.headerName }}: {{ rule.action !== 'remove' ? rule.headerValue : '(removed)' }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
              {{ rule.urlPattern }} · {{ rule.methods.join(', ') || 'ALL' }} · {{ rule.target }}
            </div>
          </div>
          <button
            @click="editRule(rule)"
            class="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
          >
            Edit
          </button>
          <button
            @click="deleteRule(rule.id)"
            class="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-gray-500">
      Select or create a profile to manage rules
    </div>

    <!-- New Profile Modal -->
    <div v-if="showNewProfileModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showNewProfileModal = false">
      <div class="bg-white rounded-lg p-4 w-80">
        <h3 class="text-lg font-semibold mb-3">New Profile</h3>
        <input
          v-model="newProfileName"
          type="text"
          placeholder="Profile name"
          class="w-full px-3 py-2 border rounded mb-3"
        />
        <div class="flex justify-end gap-2">
          <button @click="showNewProfileModal = false" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
          <button @click="createProfile" class="px-3 py-1.5 bg-blue-500 text-white rounded">Create</button>
        </div>
      </div>
    </div>

    <!-- New/Edit Rule Modal -->
    <div v-if="showNewRuleModal || editingRule" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeRuleModal">
      <div class="bg-white rounded-lg p-4 w-[400px]">
        <h3 class="text-lg font-semibold mb-3">{{ editingRule ? 'Edit Rule' : 'New Rule' }}</h3>

        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Rule Name</label>
            <input v-model="ruleForm.name" type="text" class="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">URL Pattern</label>
            <input v-model="ruleForm.urlPattern" type="text" placeholder="*://api.example.com/*" class="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">HTTP Methods</label>
            <div class="flex flex-wrap gap-2">
              <label v-for="m in ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']" :key="m" class="flex items-center gap-1">
                <input type="checkbox" :value="m" v-model="ruleForm.methods" />
                <span class="text-sm">{{ m }}</span>
              </label>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium mb-1">Target</label>
              <select v-model="ruleForm.target" class="w-full px-3 py-2 border rounded">
                <option value="request">Request Header</option>
                <option value="response">Response Header</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium mb-1">Action</label>
              <select v-model="ruleForm.action" class="w-full px-3 py-2 border rounded">
                <option value="add">Add</option>
                <option value="modify">Modify</option>
                <option value="remove">Remove</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Header Name</label>
            <input v-model="ruleForm.headerName" type="text" placeholder="Authorization" class="w-full px-3 py-2 border rounded" />
          </div>

          <div v-if="ruleForm.action !== 'remove'">
            <label class="block text-sm font-medium mb-1">Header Value</label>
            <input v-model="ruleForm.headerValue" type="text" placeholder="Bearer token123" class="w-full px-3 py-2 border rounded" />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button @click="closeRuleModal" class="px-3 py-1.5 bg-gray-200 rounded">Cancel</button>
          <button @click="saveRule" class="px-3 py-1.5 bg-blue-500 text-white rounded">Save</button>
        </div>
      </div>
    </div>

    <div v-if="message" :class="['fixed bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-lg text-sm', messageClass]">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHeaderRuleStore } from '@/stores/headerRuleStore'
import type { HeaderRule, HttpMethod, HeaderTarget, HeaderAction } from '@/types'

const store = useHeaderRuleStore()

const selectedProfileId = ref<string | null>(null)
const showNewProfileModal = ref(false)
const showNewRuleModal = ref(false)
const editingRule = ref<HeaderRule | null>(null)
const newProfileName = ref('')
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const fileInput = ref<HTMLInputElement | null>(null)

const draggedIndex = ref<number | null>(null)

const profiles = computed(() => store.profiles)
const activeProfile = computed(() => store.activeProfile)

const ruleForm = ref({
  name: '',
  urlPattern: '*://*/*',
  methods: ['ALL'] as HttpMethod[],
  target: 'request' as HeaderTarget,
  action: 'add' as HeaderAction,
  headerName: '',
  headerValue: ''
})

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

function handleProfileChange() {
  store.setActiveProfile(selectedProfileId.value)
}

async function createProfile() {
  if (!newProfileName.value.trim()) {
    showMessage('Please enter a profile name', 'error')
    return
  }
  await store.createProfile(newProfileName.value.trim())
  newProfileName.value = ''
  showNewProfileModal.value = false
  showMessage('Profile created')
}

async function toggleRule(ruleId: string) {
  if (!activeProfile.value) return
  const rule = activeProfile.value.rules.find(r => r.id === ruleId)
  if (rule) {
    await store.updateRule(activeProfile.value.id, ruleId, { enabled: !rule.enabled })
  }
}

function editRule(rule: HeaderRule) {
  editingRule.value = rule
  ruleForm.value = {
    name: rule.name,
    urlPattern: rule.urlPattern,
    methods: [...rule.methods],
    target: rule.target,
    action: rule.action,
    headerName: rule.headerName,
    headerValue: rule.headerValue
  }
}

async function deleteRule(ruleId: string) {
  if (!activeProfile.value) return
  if (!confirm('Delete this rule?')) return
  await store.deleteRule(activeProfile.value.id, ruleId)
  showMessage('Rule deleted')
}

function closeRuleModal() {
  showNewRuleModal.value = false
  editingRule.value = null
  resetRuleForm()
}

function resetRuleForm() {
  ruleForm.value = {
    name: '',
    urlPattern: '*://*/*',
    methods: ['ALL'],
    target: 'request',
    action: 'add',
    headerName: '',
    headerValue: ''
  }
}

async function saveRule() {
  if (!activeProfile.value) return
  if (!ruleForm.value.name || !ruleForm.value.headerName) {
    showMessage('Name and Header Name are required', 'error')
    return
  }

  const ruleData: HeaderRule = {
    id: editingRule.value?.id ?? `rule-${Date.now()}`,
    enabled: editingRule.value?.enabled ?? true,
    name: ruleForm.value.name,
    urlPattern: ruleForm.value.urlPattern,
    methods: ruleForm.value.methods,
    action: ruleForm.value.action,
    headerName: ruleForm.value.headerName,
    headerValue: ruleForm.value.headerValue,
    target: ruleForm.value.target
  }

  if (editingRule.value) {
    await store.updateRule(activeProfile.value.id, editingRule.value.id, ruleData)
    showMessage('Rule updated')
  } else {
    await store.addRule(activeProfile.value.id, ruleData)
    showMessage('Rule created')
  }

  closeRuleModal()
}

function onDragStart(_e: DragEvent, index: number) {
  draggedIndex.value = index
}

function onDrop(_e: DragEvent, dropIndex: number) {
  if (!activeProfile.value || draggedIndex.value === null) return

  const ruleIds = [...activeProfile.value.rules.map(r => r.id)]
  const [removed] = ruleIds.splice(draggedIndex.value, 1)
  ruleIds.splice(dropIndex, 0, removed)

  store.reorderRules(activeProfile.value.id, ruleIds)
  draggedIndex.value = null
}

async function handleExport() {
  const response = await chrome.runtime.sendMessage({ action: 'exportHeaderProfiles' })
  if (response?.success && response?.data) {
    const blob = new Blob([response.data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `header-profiles-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    showMessage('Profiles exported')
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const text = await file.text()
  const response = await chrome.runtime.sendMessage({
    action: 'importHeaderProfiles',
    jsonString: text
  })

  if (response?.success) {
    await store.loadProfiles()
    showMessage('Profiles imported')
  } else {
    showMessage(response?.error || 'Import failed', 'error')
  }

  if (fileInput.value) fileInput.value.value = ''
}

onMounted(() => {
  store.loadProfiles()
})

watch(() => store.activeProfileId, (id) => {
  selectedProfileId.value = id
}, { immediate: true })
</script>