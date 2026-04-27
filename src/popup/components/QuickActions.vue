<template>
  <div class="space-y-2">
    <div class="flex gap-1 bg-gray-200 rounded-lg p-1">
      <button 
        @click="$emit('update:mode', 'cookies')"
        :class="mode === 'cookies' ? 'bg-white shadow' : 'hover:bg-gray-100'"
        class="flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors">
        Cookies
      </button>
      <button 
        @click="$emit('update:mode', 'local')"
        :class="mode === 'local' ? 'bg-white shadow' : 'hover:bg-gray-100'"
        class="flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors">
        Local
      </button>
      <button 
        @click="$emit('update:mode', 'session')"
        :class="mode === 'session' ? 'bg-white shadow' : 'hover:bg-gray-100'"
        class="flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors">
        Session
      </button>
    </div>
    
    <button @click="$emit('copy')" :disabled="loading || count === 0"
      class="w-full py-2 px-4 bg-chrome-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors">
      Copy All
    </button>
    <button @click="$emit('paste')" :disabled="loading"
      class="w-full py-2 px-4 bg-chrome-green text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors">
      Paste
    </button>
    <button @click="$emit('delete')" :disabled="loading || count === 0"
      class="w-full py-2 px-4 bg-chrome-red text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
      Delete All
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
defineProps<{ 
  loading: boolean
  count: number
  mode: 'cookies' | 'local' | 'session'
}>()
defineEmits<{ 
  copy: []
  paste: []
  delete: []
  import: []
  export: []
  'update:mode': ['cookies' | 'local' | 'session']
}>()
</script>
