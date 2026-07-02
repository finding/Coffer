// src/content/bodyRewriter.ts

import type { BodyRewriteAction } from '@/types'

/**
 * Variable map for resolving {{varName}} patterns
 * Set externally by the injected script
 */
let variableMap: Map<string, string> = new Map()

/**
 * Set the variable map for variable resolution
 */
export function setVariableMap(map: Map<string, string>): void {
  variableMap = map
}

/**
 * Apply variables to a string value
 * Replaces {{varName}} patterns with values from variableMap
 */
export function applyVariables(value: string): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    return variableMap.get(name) || ''
  })
}

/**
 * Set a value in a JSON object by dot-notation path
 * Creates nested objects if path doesn't exist
 */
function setByPath(obj: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.')
  let current: Record<string, unknown> = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Apply a single rewrite operation to the body
 */
function applySingleRewrite(
  body: string,
  rewrite: BodyRewriteAction,
  url: string,
  method: string
): string {
  try {
    switch (rewrite.method) {
      case 'text': {
        if (!rewrite.find) return body
        // Use split/join for ES compatibility instead of replaceAll
        return body.split(rewrite.find).join(rewrite.replace || '')
      }

      case 'jsonPath': {
        if (!rewrite.path || !rewrite.value) return body
        const json = JSON.parse(body)
        const resolvedValue = applyVariables(rewrite.value)
        setByPath(json, rewrite.path, resolvedValue)
        return JSON.stringify(json)
      }

      case 'regex': {
        if (!rewrite.pattern) return body
        const regex = new RegExp(rewrite.pattern, 'g')
        return body.replace(regex, rewrite.replacement || '')
      }

      case 'script': {
        if (!rewrite.scriptBody) return body
        // Create a function that takes body, url, method and returns modified body
        const modifyFn = new Function('body', 'url', 'method', rewrite.scriptBody)
        return modifyFn(body, url, method)
      }

      default:
        return body
    }
  } catch (e) {
    console.error('[BodyRewriter] Rewrite error:', e, rewrite)
    return body // Return current body, continue with subsequent rewrites
  }
}

/**
 * Apply multiple rewrite operations to the request body
 * Operations are applied in sequence
 */
export function rewriteBody(
  body: string,
  rewrites: BodyRewriteAction[],
  url: string,
  method: string
): string {
  let currentBody = body

  for (const rewrite of rewrites) {
    currentBody = applySingleRewrite(currentBody, rewrite, url, method)
  }

  return currentBody
}

/**
 * Apply rewrite operations to FormData
 * Returns a new FormData with modified values
 */
export function rewriteFormData(
  formData: FormData,
  rewrites: BodyRewriteAction[],
  url: string,
  method: string
): FormData {
  const newFormData = new FormData()

  // Copy existing entries
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      // Apply rewrites to string values
      let modifiedValue = value
      for (const rewrite of rewrites) {
        try {
          switch (rewrite.method) {
            case 'text': {
              if (rewrite.find) {
                modifiedValue = modifiedValue.split(rewrite.find).join(rewrite.replace || '')
              }
              break
            }
            case 'jsonPath': {
              // jsonPath for FormData: treat path as field name
              if (rewrite.path === key && rewrite.value) {
                modifiedValue = applyVariables(rewrite.value)
              }
              break
            }
            case 'regex': {
              if (rewrite.pattern) {
                const regex = new RegExp(rewrite.pattern, 'g')
                modifiedValue = modifiedValue.replace(regex, rewrite.replacement || '')
              }
              break
            }
            case 'script': {
              if (rewrite.scriptBody) {
                const modifyFn = new Function('value', 'key', 'url', 'method', rewrite.scriptBody)
                modifiedValue = modifyFn(modifiedValue, key, url, method)
              }
              break
            }
          }
        } catch (e) {
          console.error('[BodyRewriter] FormData rewrite error:', e, rewrite)
        }
      }
      newFormData.set(key, modifiedValue)
    } else {
      // Keep File/Blob unchanged
      newFormData.set(key, value)
    }
  }

  return newFormData
}

/**
 * Apply rewrite operations to GET request query parameters
 * Operations are applied in sequence
 */
export function rewriteGetParams(
  url: string,
  rewrites: BodyRewriteAction[]
): string {
  const [baseUrl, queryString] = url.split('?')
  if (!queryString) return url

  let currentQueryString = queryString

  for (const rewrite of rewrites) {
    try {
      switch (rewrite.method) {
        case 'text': {
          if (rewrite.find) {
            // Use split/join for ES compatibility instead of replaceAll
            currentQueryString = currentQueryString.split(rewrite.find).join(rewrite.replace || '')
          }
          break
        }

        case 'regex': {
          if (rewrite.pattern) {
            const regex = new RegExp(rewrite.pattern, 'g')
            currentQueryString = currentQueryString.replace(regex, rewrite.replacement || '')
          }
          break
        }

        case 'jsonPath': {
          // jsonPath is used to modify individual query parameters
          if (rewrite.path) {
            const params = new URLSearchParams(currentQueryString)
            if (params.has(rewrite.path)) {
              params.set(rewrite.path, applyVariables(rewrite.value || ''))
            }
            currentQueryString = params.toString()
          }
          break
        }

        case 'script': {
          if (rewrite.scriptBody) {
            const params = new URLSearchParams(currentQueryString)
            const modifyFn = new Function('params', 'url', rewrite.scriptBody)
            modifyFn(params, url)
            currentQueryString = params.toString()
          }
          break
        }
      }
    } catch (e) {
      console.error('[BodyRewriter] GET params rewrite error:', e, rewrite)
    }
  }

  return `${baseUrl}?${currentQueryString}`
}