<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto">
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="text-lg font-semibold">{{ isNew ? 'New Item' : 'Edit Item' }}</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Key</label>
          <input v-model="form.key" type="text" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Value</label>
          <textarea v-model="form.value" required rows="5"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue font-mono text-xs" />
        </div>
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" @click="$emit('close')" class="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-chrome-blue text-white rounded-lg hover:bg-blue-600">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StorageItem } from '@/types'

const props = defineProps<{ item?: StorageItem }>()
const emit = defineEmits<{ close: []; save: [StorageItem] }>()

const isNew = !props.item
const form = ref<StorageItem>({
  key: '',
  value: '',
  ...props.item
})

watch(() => props.item, (i) => { if (i) form.value = { ...i } }, { immediate: true })

function handleSubmit() { emit('save', form.value) }
</script>
