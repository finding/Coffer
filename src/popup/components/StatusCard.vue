<template>
  <div class="bg-white rounded-lg shadow p-4 mb-4">
    <div class="text-sm text-gray-500 mb-1">Current Domain</div>
    <div class="text-lg font-semibold text-gray-900 truncate">{{ domain }}</div>
    <div class="mt-2 flex items-center justify-between">
      <span class="text-sm text-gray-500">Cookies</span>
      <span class="text-2xl font-bold text-chrome-blue">{{ count }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ domain: string; count: number }>()
</script>
