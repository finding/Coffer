<template>
  <div class="flex border-b bg-white">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      @click="$emit('update:active', tab.id)"
      class="px-4 py-2 text-sm font-medium transition-colors"
      :class="active === tab.id 
        ? 'text-chrome-blue border-b-2 border-chrome-blue' 
        : 'text-gray-600 hover:text-gray-800'"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="ml-1 text-xs text-gray-400">({{ tab.count }})</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ 
  active: 'cookies' | 'local' | 'session';
  counts?: { cookies?: number; local?: number; session?: number }
}>()
defineEmits<{ 'update:active': ['cookies' | 'local' | 'session'] }>()

const tabs = computed(() => [
  { id: 'cookies' as const, label: 'Cookies', count: props.counts?.cookies },
  { id: 'local' as const, label: 'LocalStorage', count: props.counts?.local },
  { id: 'session' as const, label: 'SessionStorage', count: props.counts?.session }
])
</script>
