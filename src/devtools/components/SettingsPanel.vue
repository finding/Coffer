<template>
  <div class="p-4 space-y-4">
    <h3 class="text-lg font-semibold mb-4">Settings</h3>
    <div class="flex items-center justify-between">
      <div>
        <div class="font-medium">Persist Clipboard</div>
        <div class="text-sm text-gray-500">Save clipboard to storage</div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input v-model="persistMode" type="checkbox" class="sr-only peer" @change="handlePersistChange" />
        <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-chrome-blue rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-chrome-blue"></div>
      </label>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <div class="font-medium">Max Clipboard Items</div>
        <div class="text-sm text-gray-500">Maximum saved clipboard items</div>
      </div>
      <input v-model.number="maxItems" type="number" min="1" max="50"
        class="w-20 px-2 py-1 border rounded" @change="handleMaxItemsChange" />
    </div>
    <div class="pt-4 border-t">
      <button @click="$emit('close')" class="w-full py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingStore } from '@/stores/settingStore'

defineEmits<{ close: [] }>()
const settingStore = useSettingStore()
const persistMode = ref(false)
const maxItems = ref(10)

onMounted(async () => {
  await settingStore.load()
  persistMode.value = settingStore.persistMode
  maxItems.value = settingStore.maxClipboardItems
})

async function handlePersistChange() {
  settingStore.updateSettings({ persistMode: persistMode.value })
  await settingStore.save()
}

async function handleMaxItemsChange() {
  settingStore.updateSettings({ maxClipboardItems: maxItems.value })
  await settingStore.save()
}
</script>
