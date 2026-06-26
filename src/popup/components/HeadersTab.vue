<!-- src/popup/components/HeadersTab.vue -->
<template>
  <div class="p-2">
    <div class="flex items-center gap-2 mb-3">
      <select
        v-model="selectedProfileId"
        @change="handleProfileChange"
        class="flex-1 px-2 py-1.5 border rounded text-sm"
      >
        <option :value="null">No Profile Active</option>
        <option v-for="p in profiles" :key="p.id" :value="p.id">
          {{ p.name }} ({{ p.rules.length }} rules)
        </option>
      </select>
      <button
        @click="$emit('openManager')"
        class="px-2 py-1.5 bg-gray-200 rounded hover:bg-gray-300 text-sm"
      >
        Manage
      </button>
    </div>

    <div v-if="activeProfile" class="space-y-1">
      <div
        v-for="rule in activeProfile.rules"
        :key="rule.id"
        class="flex items-center gap-2 p-2 bg-white rounded border"
      >
        <input
          type="checkbox"
          :checked="rule.enabled"
          @change="toggleRule(rule.id)"
          class="w-4 h-4"
        >
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ rule.name }}</div>
          <div class="text-xs text-gray-500 truncate">
            {{ rule.headers.length > 0 ? rule.headers[0].headerName : 'No headers' }}
          </div>
        </div>
        <span class="text-xs px-1.5 py-0.5 rounded" :class="getTargetClass(rule.target)">
          {{ rule.target }}
        </span>
      </div>
    </div>

    <div v-else class="text-center py-4 text-gray-500 text-sm">
      No profile active
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useHeaderRuleStore } from '@/stores/requestRewriteStore'

defineEmits<{ openManager: [] }>()

const store = useHeaderRuleStore()
const selectedProfileId = ref<string | null>(null)

const profiles = computed(() => store.profiles)
const activeProfile = computed(() => store.activeProfile)

function handleProfileChange() {
  store.setActiveProfile(selectedProfileId.value)
}

async function toggleRule(ruleId: string) {
  if (!activeProfile.value) return
  const rule = activeProfile.value.rules.find(r => r.id === ruleId)
  if (rule) {
    await store.updateRule(activeProfile.value.id, ruleId, { enabled: !rule.enabled })
  }
}

function getTargetClass(target: 'request' | 'response') {
  return target === 'request' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
}

onMounted(() => {
  store.loadProfiles()
})

watch(() => store.activeProfileId, (id) => {
  selectedProfileId.value = id
}, { immediate: true })
</script>