# Task 4: 变量Store

**Context:** This task creates a Pinia store for managing variables with reactive state and variable resolution functionality.

**Files:**
- Create: `src/stores/variableStore.ts`

**Interfaces:**
- Consumes: `variableStorage` from Task 3, `PresetVariable`, `AutoExtractVariable` from Task 1
- Produces: `useVariableStore()` with `presetVariables`, `autoExtractVariables`, `loadVariables()`, `resolveVariable()`

---

## Steps

- [ ] **Step 1: 创建变量Store**

```typescript
// src/stores/variableStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PresetVariable, AutoExtractVariable } from '@/types'
import { variableStorage } from '@/services/variableStorage'

export const useVariableStore = defineStore('variables', () => {
  const presetVariables = ref<PresetVariable[]>([])
  const autoExtractVariables = ref<AutoExtractVariable[]>([])
  
  // 运行时提取的变量值（从页面自动获取）
  const extractedValues = ref<Map<string, string>>(new Map())

  async function loadVariables(): Promise<void> {
    presetVariables.value = await variableStorage.getPresetVariables()
    autoExtractVariables.value = await variableStorage.getAutoExtractVariables()
  }

  async function addPresetVariable(variable: PresetVariable): Promise<void> {
    await variableStorage.addPresetVariable(variable)
    presetVariables.value.push(variable)
  }

  async function updatePresetVariable(name: string, updates: Partial<PresetVariable>): Promise<void> {
    await variableStorage.updatePresetVariable(name, updates)
    const index = presetVariables.value.findIndex(v => v.name === name)
    if (index !== -1) {
      presetVariables.value[index] = { ...presetVariables.value[index], ...updates }
    }
  }

  async function deletePresetVariable(name: string): Promise<void> {
    await variableStorage.deletePresetVariable(name)
    presetVariables.value = presetVariables.value.filter(v => v.name !== name)
  }

  async function addAutoExtractVariable(variable: AutoExtractVariable): Promise<void> {
    await variableStorage.addAutoExtractVariable(variable)
    autoExtractVariables.value.push(variable)
  }

  async function deleteAutoExtractVariable(name: string): Promise<void> {
    await variableStorage.deleteAutoExtractVariable(name)
    autoExtractVariables.value = autoExtractVariables.value.filter(v => v.name !== name)
  }

  // 解析变量引用 {{varName}} 或 {{auto:varName}}
  function resolveVariable(value: string): string {
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      // 优先使用自动提取的值
      if (extractedValues.value.has(name)) {
        return extractedValues.value.get(name) || ''
      }
      // 其次使用预设变量
      const preset = presetVariables.value.find(v => v.name === name)
      if (preset) {
        return preset.value
      }
      // 变量未找到，返回空字符串
      console.warn('[Variables] Variable not found:', name)
      return ''
    })
  }

  // 从页面提取变量值（由content script调用）
  function setExtractedValue(name: string, value: string): void {
    extractedValues.value.set(name, value)
  }

  return {
    presetVariables,
    autoExtractVariables,
    extractedValues,
    loadVariables,
    addPresetVariable,
    updatePresetVariable,
    deletePresetVariable,
    addAutoExtractVariable,
    deleteAutoExtractVariable,
    resolveVariable,
    setExtractedValue
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/variableStore.ts
git commit -m "feat: add variable store with resolveVariable"
```

---

**Global Constraints:**
- 变量支持预设变量和自动提取变量两种
- 变量引用语法：{{varName}}
- 变量优先级：自动提取变量 > 预设变量
