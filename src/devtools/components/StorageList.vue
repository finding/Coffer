<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th class="w-8 p-2"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th class="text-left p-2">Key</th>
          <th class="text-left p-2">Value</th>
          <th class="text-center p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.key"
          class="border-b hover:bg-gray-50" :class="{ 'bg-blue-50': selected.has(item) }">
          <td class="p-2"><input type="checkbox" :checked="selected.has(item)" @change="toggleSelect(item)" /></td>
          <td class="p-2">
            <div 
              @click="copyToClipboard(item)"
              class="group flex items-center gap-1 cursor-pointer"
              :title="item.key"
            >
              <span class="font-mono text-xs truncate max-w-[200px] group-hover:text-chrome-blue group-hover:underline">{{ item.key }}</span>
              <svg class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </td>
          <td class="p-2">
            <div 
              @click="copyToClipboard(item)"
              class="group flex items-center gap-1 cursor-pointer"
              :title="item.value"
            >
              <span class="font-mono text-xs truncate max-w-[300px] group-hover:text-chrome-blue group-hover:underline">{{ item.value }}</span>
              <svg class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </td>
          <td class="p-2 text-center">
            <button @click="$emit('edit', item)" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">Edit</button>
            <button @click="$emit('delete', item)" class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 ml-1">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="items.length === 0" class="p-8 text-center text-gray-500">No items found</div>
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="copied" class="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm shadow-lg">
          Copied!
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StorageItem } from '@/types'

const props = defineProps<{ items: StorageItem[]; selected: Set<StorageItem> }>()
const emit = defineEmits<{ 
  'update:selected': [Set<StorageItem>]; 
  'edit': [StorageItem]; 
  'delete': [StorageItem];
  'copy': [StorageItem]
}>()

const copied = ref(false)

const allSelected = computed(() => props.items.length > 0 && props.items.every(item => props.selected.has(item)))

function toggleSelectAll() {
  const newSelected = new Set(props.selected)
  if (allSelected.value) props.items.forEach(item => newSelected.delete(item))
  else props.items.forEach(item => newSelected.add(item))
  emit('update:selected', newSelected)
}

function toggleSelect(item: StorageItem) {
  const newSelected = new Set(props.selected)
  if (newSelected.has(item)) newSelected.delete(item)
  else newSelected.add(item)
  emit('update:selected', newSelected)
}

async function copyToClipboard(item: StorageItem) {
  try {
    const json = JSON.stringify([item], null, 2)
    await navigator.clipboard.writeText(json)
    emit('copy', item)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>
