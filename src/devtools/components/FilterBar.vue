<template>
  <div class="flex gap-2 p-4 bg-white border-b">
    <input v-model="keyword" type="text" placeholder="Search cookies..."
      class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue"
      @input="$emit('update:keyword', keyword)" />
    <select v-model="attribute"
      class="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-blue"
      @change="$emit('update:attribute', attribute)">
      <option value="">All attributes</option>
      <option value="secure">Secure</option>
      <option value="httpOnly">HttpOnly</option>
      <option value="session">Session</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const keyword = ref('')
const attribute = ref('')
defineEmits<{ 'update:keyword': [string]; 'update:attribute': [string] }>()
</script>
