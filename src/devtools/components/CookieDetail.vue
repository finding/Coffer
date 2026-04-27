<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto">
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="text-lg font-semibold">{{ isNew ? 'New Cookie' : 'Edit Cookie' }}</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <form @submit.prevent="handleSubmit" class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Name</label>
          <input v-model="form.name" type="text" required
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Value</label>
          <textarea v-model="form.value" required rows="3"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Domain</label>
            <input v-model="form.domain" type="text" required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Path</label>
            <input v-model="form.path" type="text" required
              class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue" />
          </div>
        </div>
        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input v-model="form.secure" type="checkbox" class="rounded" />
            <span class="text-sm">Secure</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.httpOnly" type="checkbox" class="rounded" />
            <span class="text-sm">HttpOnly</span>
          </label>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">SameSite</label>
          <select v-model="form.sameSite"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue">
            <option value="lax">Lax</option>
            <option value="strict">Strict</option>
            <option value="no_restriction">None</option>
          </select>
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
import type { CookieItem } from '@/types'

const props = defineProps<{ cookie?: CookieItem; domain: string }>()
const emit = defineEmits<{ close: []; save: [CookieItem] }>()

const isNew = !props.cookie
const form = ref<CookieItem>({
  name: '', value: '', domain: props.domain, path: '/',
  secure: false, httpOnly: false, sameSite: 'lax', storeId: '0',
  ...props.cookie
})

watch(() => props.cookie, (c) => { if (c) form.value = { ...c } }, { immediate: true })

function handleSubmit() { emit('save', form.value) }
</script>
