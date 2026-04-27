<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th class="w-8 p-2"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th class="text-left p-2">Name</th>
          <th class="text-left p-2">Value</th>
          <th class="text-left p-2">Domain</th>
          <th class="text-left p-2">Path</th>
          <th class="text-center p-2">Secure</th>
          <th class="text-center p-2">HttpOnly</th>
          <th class="text-center p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in cookies" :key="`${c.domain}-${c.name}`"
          class="border-b hover:bg-gray-50" :class="{ 'bg-blue-50': selected.has(c) }">
          <td class="p-2"><input type="checkbox" :checked="selected.has(c)" @change="toggleSelect(c)" /></td>
          <td class="p-2">
            <div 
              @click="copyToClipboard(c.name)"
              class="group flex items-center gap-1 cursor-pointer"
              :title="c.name"
            >
              <span class="font-mono text-xs truncate max-w-[130px] group-hover:text-chrome-blue group-hover:underline">{{ c.name }}</span>
              <svg class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </td>
          <td class="p-2">
            <div 
              @click="copyToClipboard(c.value)"
              class="group flex items-center gap-1 cursor-pointer"
              :title="c.value"
            >
              <span class="font-mono text-xs truncate max-w-[180px] group-hover:text-chrome-blue group-hover:underline">{{ c.value }}</span>
              <svg class="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </td>
          <td class="p-2 text-gray-500 text-xs">{{ c.domain }}</td>
          <td class="p-2 text-gray-500 text-xs">{{ c.path }}</td>
          <td class="p-2 text-center"><span v-if="c.secure" class="text-chrome-green">✓</span></td>
          <td class="p-2 text-center"><span v-if="c.httpOnly" class="text-chrome-yellow">✓</span></td>
          <td class="p-2 text-center">
            <button @click="$emit('edit', c)" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">Edit</button>
            <button @click="$emit('delete', c)" class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 ml-1">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="cookies.length === 0" class="p-8 text-center text-gray-500">No cookies found</div>
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
import type { CookieItem } from '@/types'

const props = defineProps<{ cookies: CookieItem[]; selected: Set<CookieItem> }>()
const emit = defineEmits<{ 'update:selected': [Set<CookieItem>]; 'edit': [CookieItem]; 'delete': [CookieItem] }>()

const copied = ref(false)

const allSelected = computed(() => props.cookies.length > 0 && props.cookies.every(c => props.selected.has(c)))

function toggleSelectAll() {
  const newSelected = new Set(props.selected)
  if (allSelected.value) props.cookies.forEach(c => newSelected.delete(c))
  else props.cookies.forEach(c => newSelected.add(c))
  emit('update:selected', newSelected)
}

function toggleSelect(cookie: CookieItem) {
  const newSelected = new Set(props.selected)
  if (newSelected.has(cookie)) newSelected.delete(cookie)
  else newSelected.add(cookie)
  emit('update:selected', newSelected)
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>
