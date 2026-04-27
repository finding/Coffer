<template>
  <div class="flex-1 overflow-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th class="w-8 p-2"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th class="text-left p-2">Name</th>
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
          <td class="p-2 font-mono text-xs truncate max-w-[200px]">{{ c.name }}</td>
          <td class="p-2 text-gray-500">{{ c.domain }}</td>
          <td class="p-2 text-gray-500">{{ c.path }}</td>
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CookieItem } from '@/types'

const props = defineProps<{ cookies: CookieItem[]; selected: Set<CookieItem> }>()
const emit = defineEmits<{ 'update:selected': [Set<CookieItem>]; 'edit': [CookieItem]; 'delete': [CookieItem] }>()

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
</script>
