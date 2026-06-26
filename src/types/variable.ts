// src/types/variable.ts

/**
 * PresetVariable - A variable with a static value defined by the user
 */
export interface PresetVariable {
  name: string
  value: string
  description?: string
}

/**
 * AutoExtractVariable - A variable that extracts its value from browser storage
 */
export interface AutoExtractVariable {
  name: string
  source: 'localStorage' | 'sessionStorage' | 'cookie' | 'meta'
  key: string
}

/**
 * Variable - Union type for all variable types
 */
export type Variable = PresetVariable | AutoExtractVariable
