// src/services/variableStorage.ts

import type { PresetVariable, AutoExtractVariable } from '@/types'

const PRESET_VARS_KEY = 'presetVariables'
const AUTO_EXTRACT_VARS_KEY = 'autoExtractVariables'

/**
 * VariableStorage - Manages preset and auto-extract variables for rewrite rules
 *
 * Preset variables are user-defined static values.
 * Auto-extract variables dynamically extract values from browser storage.
 */
export class VariableStorage {
  async getPresetVariables(): Promise<PresetVariable[]> {
    const result = await chrome.storage.local.get(PRESET_VARS_KEY)
    return result[PRESET_VARS_KEY] || []
  }

  async savePresetVariables(variables: PresetVariable[]): Promise<void> {
    await chrome.storage.local.set({ [PRESET_VARS_KEY]: variables })
  }

  async getAutoExtractVariables(): Promise<AutoExtractVariable[]> {
    const result = await chrome.storage.local.get(AUTO_EXTRACT_VARS_KEY)
    return result[AUTO_EXTRACT_VARS_KEY] || []
  }

  async saveAutoExtractVariables(variables: AutoExtractVariable[]): Promise<void> {
    await chrome.storage.local.set({ [AUTO_EXTRACT_VARS_KEY]: variables })
  }

  async addPresetVariable(variable: PresetVariable): Promise<void> {
    const vars = await this.getPresetVariables()
    vars.push(variable)
    await this.savePresetVariables(vars)
  }

  async updatePresetVariable(name: string, updates: Partial<PresetVariable>): Promise<void> {
    const vars = await this.getPresetVariables()
    const index = vars.findIndex(v => v.name === name)
    if (index !== -1) {
      vars[index] = { ...vars[index], ...updates }
      await this.savePresetVariables(vars)
    }
  }

  async deletePresetVariable(name: string): Promise<void> {
    const vars = await this.getPresetVariables()
    const filtered = vars.filter(v => v.name !== name)
    await this.savePresetVariables(filtered)
  }

  async addAutoExtractVariable(variable: AutoExtractVariable): Promise<void> {
    const vars = await this.getAutoExtractVariables()
    vars.push(variable)
    await this.saveAutoExtractVariables(vars)
  }

  async deleteAutoExtractVariable(name: string): Promise<void> {
    const vars = await this.getAutoExtractVariables()
    const filtered = vars.filter(v => v.name !== name)
    await this.saveAutoExtractVariables(filtered)
  }
}

export const variableStorage = new VariableStorage()