<!-- src/devtools/components/HeadersPanel.vue -->
<template>
  <div class="h-full flex flex-col">
    <!-- Profile Selector -->
    <div class="flex items-center gap-2 p-2 bg-white border-b">
      <select
        v-model="selectedProfileId"
        @change="handleProfileChange"
        class="flex-1 px-2 py-1.5 border rounded text-sm"
      >
        <option :value="null">No Active Profile</option>
        <option v-for="p in profiles" :key="p.id" :value="p.id">
          {{ p.name }} ({{ p.rules.filter(r => r.enabled).length }}/{{ p.rules.length }})
        </option>
      </select>
      <button
        @click="refreshProfiles"
        class="px-2 py-1.5 bg-gray-200 rounded text-sm hover:bg-gray-300"
      >
        Refresh
      </button>
    </div>

    <!-- Rules List -->
    <div class="flex-1 overflow-auto">
      <div v-if="activeProfile" class="p-2 space-y-1">
        <div
          v-for="rule in activeProfile.rules"
          :key="rule.id"
          class="flex items-center gap-2 p-2 bg-white rounded border text-sm"
        >
          <input
            type="checkbox"
            :checked="rule.enabled"
            @change="toggleRule(rule.id)"
            class="w-4 h-4"
          >
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{{ rule.name }}</div>
            <div class="text-xs text-gray-500 truncate">
              {{ rule.headers.length > 0 ? rule.headers[0].headerName : 'No headers' }} · {{ rule.target }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="p-4 text-center text-gray-500 text-sm">
        No profile active. Use Manager to configure profiles.
      </div>
    </div>

    <div v-if="message" :class="['p-2 text-sm', messageClass]">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHeaderRuleStore } from '@/stores/requestRewriteStore'

const store = useHeaderRuleStore()

const selectedProfileId = ref<string | null>(null)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const profiles = computed(() => store.profiles)
const activeProfile = computed(() => store.activeProfile)

const messageClass = computed(() =>
  messageType.value === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
)

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 2000)
}

function handleProfileChange() {
  store.setActiveProfile(selectedProfileId.value)
}

async function toggleRule(ruleId: string) {
  if (!activeProfile.value) return
  const rule = activeProfile.value.rules.find(r => r.id === ruleId)
  if (rule) {
    await store.updateRule(activeProfile.value.id, ruleId, { enabled: !rule.enabled })
    showMessage(`Rule ${!rule.enabled ? 'enabled' : 'disabled'}`)
  }
}

async function refreshProfiles() {
  await store.loadProfiles()
  showMessage('Profiles refreshed')
}

onMounted(() => {
  store.loadProfiles()
})

watch(() => store.activeProfileId, (id) => {
  selectedProfileId.value = id
}, { immediate: true })
</script>