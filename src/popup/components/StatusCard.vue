<template>
  <div class="bg-white rounded-lg shadow p-4 mb-4">
    <div class="text-sm text-gray-500 mb-1">Current Domain</div>
    <div class="text-lg font-semibold text-gray-900 truncate">{{ domain }}</div>
    <div class="mt-2 grid grid-cols-3 gap-2 text-center">
      <div>
        <span class="text-xs text-gray-500">Cookies</span>
        <div class="text-xl font-bold text-chrome-blue">{{ cookieCount }}</div>
      </div>
      <div>
        <span class="text-xs text-gray-500">Local</span>
        <div class="text-xl font-bold text-green-600">{{ localStorageCount }}</div>
      </div>
      <div>
        <span class="text-xs text-gray-500">Session</span>
        <div class="text-xl font-bold text-purple-600">{{ sessionStorageCount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ 
  domain: string
  cookieCount: number
  localStorageCount: number
  sessionStorageCount: number
}>()
</script>
