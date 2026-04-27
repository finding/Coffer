<template>
  <div class="space-y-2">
    <button @click="$emit('copy')" :disabled="loading"
      class="w-full py-2 px-4 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors">
      Copy All Cookies
    </button>
    <button @click="$emit('paste')" :disabled="loading || !hasClipboard"
      class="w-full py-2 px-4 bg-chrome-green text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors">
      Paste Cookies
    </button>
    <button @click="$emit('delete')" :disabled="loading || count === 0"
      class="w-full py-2 px-4 bg-chrome-red text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
      Delete All Cookies
    </button>
    <div class="flex gap-2 pt-2">
      <button @click="$emit('import')"
        class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
        Import
      </button>
      <button @click="$emit('export')" :disabled="count === 0"
        class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
        Export
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ loading: boolean; hasClipboard: boolean; count: number }>()
defineEmits<{ copy: []; paste: []; delete: []; import: []; export: [] }>()
</script>
