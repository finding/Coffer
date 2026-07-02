// src/stores/variableStore.ts

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PresetVariable, AutoExtractVariable } from '@/types'
import { variableStorage } from '@/services/variableStorage'

/**
 * VariableStore - Manages preset and auto-extract variables for rewrite rules
 *
 * Preset variables are user-defined static values.
 * Auto-extract variables dynamically extract values from browser storage.
 * Variable resolution priority: extracted values (runtime) > preset variables
 */
export const useVariableStore = defineStore('variables', () => {
  const presetVariables = ref<PresetVariable[]>([])
  const autoExtractVariables = ref<AutoExtractVariable[]>([])

  // Runtime extracted values (from page auto-extraction)
  const extractedValues = ref<Map<string, string>>(new Map())

  /**
   * Load all variables from storage
   */
  async function loadVariables(): Promise<void> {
    presetVariables.value = await variableStorage.getPresetVariables()
    autoExtractVariables.value = await variableStorage.getAutoExtractVariables()
  }

  /**
   * Add a new preset variable
   */
  async function addPresetVariable(variable: PresetVariable): Promise<void> {
    await variableStorage.addPresetVariable(variable)
    presetVariables.value.push(variable)
  }

  /**
   * Update an existing preset variable
   */
  async function updatePresetVariable(name: string, updates: Partial<PresetVariable>): Promise<void> {
    await variableStorage.updatePresetVariable(name, updates)
    const index = presetVariables.value.findIndex(v => v.name === name)
    if (index !== -1) {
      presetVariables.value[index] = { ...presetVariables.value[index], ...updates }
    }
  }

  /**
   * Delete a preset variable
   */
  async function deletePresetVariable(name: string): Promise<void> {
    await variableStorage.deletePresetVariable(name)
    presetVariables.value = presetVariables.value.filter(v => v.name !== name)
  }

  /**
   * Add a new auto-extract variable
   */
  async function addAutoExtractVariable(variable: AutoExtractVariable): Promise<void> {
    await variableStorage.addAutoExtractVariable(variable)
    autoExtractVariables.value.push(variable)
  }

  /**
   * Delete an auto-extract variable
   */
  async function deleteAutoExtractVariable(name: string): Promise<void> {
    await variableStorage.deleteAutoExtractVariable(name)
    autoExtractVariables.value = autoExtractVariables.value.filter(v => v.name !== name)
  }

  /**
   * Resolve variable references in a string
   * Supports syntax: {{varName}}
   * Priority: extracted values (runtime) > preset variables
   */
  function resolveVariable(value: string): string {
    return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      // Priority 1: Use auto-extracted runtime values
      if (extractedValues.value.has(name)) {
        return extractedValues.value.get(name) || ''
      }
      // Priority 2: Use preset variables
      const preset = presetVariables.value.find(v => v.name === name)
      if (preset) {
        return preset.value
      }
      // Variable not found, return empty string
      console.warn('[Variables] Variable not found:', name)
      return ''
    })
  }

  /**
   * Set an extracted value (called by content script)
   */
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