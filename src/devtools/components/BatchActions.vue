<template>
  <div class="p-4 bg-gray-50 border-t flex gap-2">
    <span class="text-sm text-gray-500 self-center mr-4">{{ selectedCount }} selected</span>
    <button @click="$emit('copy')" :disabled="selectedCount === 0"
      class="px-4 py-2 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">Copy</button>
    <button @click="$emit('delete')" :disabled="selectedCount === 0"
      class="px-4 py-2 bg-chrome-red text-white rounded-lg hover:bg-red-600 disabled:opacity-50">Delete</button>
    <button @click="$emit('export')" :disabled="selectedCount === 0"
      class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">Export</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ selectedCount: number }>()
defineEmits<{ copy: []; delete: []; export: [] }>()
</script>
