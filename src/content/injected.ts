// src/content/injected.ts
// This script runs in page context (not extension context)
// It intercepts fetch/XHR and applies rewrite rules
// IMPORTANT: This must be built as a standalone file, not as a module

(function() {
  'use strict'

  // Detect if CSP allows dynamic code execution
  let cspAllowsEval = true
  try {
    new Function('return 1')
  } catch (e) {
    cspAllowsEval = false
    console.warn('[RequestRewrite] CSP blocks dynamic scripts - script method disabled')
  }

  // Rules and variables storage
  let currentRules: any[] = []
  let variableMap = new Map<string, string>()

  // Listen for config from content script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return
    if ((event.data as any).type === 'REQUEST_REWRITE_CONFIG') {
      currentRules = (event.data as any).rules || []
      variableMap = new Map(Object.entries((event.data as any).variables || {}))
      console.log('[RequestRewrite] Received config:', currentRules.length, 'rules', cspAllowsEval ? '' : '(script method disabled by CSP)')
    }
  })

  // Request config from content script
  window.postMessage({ type: 'REQUEST_REWRITE_GET_CONFIG' }, '*')

  // Apply variables to a string value
  function applyVariables(value: string): string {
    if (typeof value !== 'string') return value
    return value.replace(/\{\{(\w+)\}\}/g, function(_, name) {
      return variableMap.get(name) || ''
    })
  }

  // Set a value in a JSON object by dot-notation path
  function setByPath(obj: Record<string, any>, path: string, value: string): void {
    const parts = path.split('.')
    let current: Record<string, any> = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }

    current[parts[parts.length - 1]] = value
  }

  // Apply a single rewrite operation to the body
  function applySingleRewrite(body: string, rewrite: any, url: string, method: string): string {
    try {
      switch (rewrite.method) {
        case 'text': {
          if (!rewrite.find) return body
          return body.split(rewrite.find).join(rewrite.replace || '')
        }

        case 'jsonPath': {
          if (!rewrite.path || rewrite.value === undefined) return body
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
          if (!cspAllowsEval) {
            console.warn('[RequestRewrite] Script method blocked by page CSP')
            return body
          }
          try {
            const modifyFn = new Function('body', 'url', 'method', rewrite.scriptBody)
            return modifyFn(body, url, method)
          } catch (scriptError) {
            console.error('[RequestRewrite] Script execution error:', scriptError)
            return body
          }
        }

        default:
          return body
      }
    } catch (e) {
      console.error('[RequestRewrite] Rewrite error:', e, rewrite)
      return body
    }
  }

  // Apply multiple rewrite operations
  function applyRewrites(body: string, rewrites: any[], url: string, method: string): string {
    let result = body
    for (let i = 0; i < rewrites.length; i++) {
      result = applySingleRewrite(result, rewrites[i], url, method)
    }
    return result
  }

  // Apply rewrites to FormData
  function rewriteFormData(formData: FormData, rewrites: any[], url: string, method: string): FormData {
    const newFormData = new FormData()

    let entries: [string, string | Blob][] = []
    try {
      entries = Array.from(formData.entries()) as [string, string | Blob][]
    } catch (e) {
      return formData
    }

    for (let i = 0; i < entries.length; i++) {
      const key = entries[i][0]
      const value = entries[i][1]

      if (typeof value === 'string') {
        let modifiedValue = value

        for (let j = 0; j < rewrites.length; j++) {
          const rewrite = rewrites[j]
          try {
            switch (rewrite.method) {
              case 'text': {
                if (rewrite.find) {
                  modifiedValue = modifiedValue.split(rewrite.find).join(rewrite.replace || '')
                }
                break
              }
              case 'jsonPath': {
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
                if (rewrite.scriptBody && cspAllowsEval) {
                  const modifyFn = new Function('value', 'key', 'url', 'method', rewrite.scriptBody)
                  modifiedValue = modifyFn(modifiedValue, key, url, method)
                }
                break
              }
            }
          } catch (e) {
            console.error('[RequestRewrite] FormData rewrite error:', e)
          }
        }
        newFormData.set(key, modifiedValue)
      } else {
        newFormData.set(key, value)
      }
    }

    return newFormData
  }

  // Rewrite GET request query parameters
  function rewriteGetParams(url: string, rewrites: any[]): string {
    const parts = url.split('?')
    if (parts.length < 2) return url

    const baseUrl = parts[0]
    let queryString = parts.slice(1).join('?')

    for (let i = 0; i < rewrites.length; i++) {
      const rewrite = rewrites[i]
      try {
        switch (rewrite.method) {
          case 'text': {
            if (rewrite.find) {
              queryString = queryString.split(rewrite.find).join(rewrite.replace || '')
            }
            break
          }

          case 'regex': {
            if (rewrite.pattern) {
              const regex = new RegExp(rewrite.pattern, 'g')
              queryString = queryString.replace(regex, rewrite.replacement || '')
            }
            break
          }

          case 'jsonPath': {
            if (rewrite.path) {
              const params = new URLSearchParams(queryString)
              if (params.has(rewrite.path)) {
                params.set(rewrite.path, applyVariables(rewrite.value || ''))
              }
              queryString = params.toString()
            }
            break
          }

          case 'script': {
            if (rewrite.scriptBody && cspAllowsEval) {
              const params = new URLSearchParams(queryString)
              const modifyFn = new Function('params', 'url', rewrite.scriptBody)
              modifyFn(params, url)
              queryString = params.toString()
            }
            break
          }
        }
      } catch (e) {
        console.error('[RequestRewrite] GET params rewrite error:', e, rewrite)
      }
    }

    return baseUrl + '?' + queryString
  }

  // Normalize URL - convert relative URLs to absolute URLs
  function normalizeUrl(url: string): string {
    // First try: absolute URL
    try {
      new URL(url)
      return url
    } catch {}

    // Second try: relative URL with page URL as base
    try {
      if (window.location.href && window.location.href !== 'about:blank') {
        const absolute = new URL(url, window.location.href)
        return absolute.href
      }
    } catch {}

    // Third try: for about:blank or special URLs, use a dummy base
    try {
      const dummyBase = 'https://dummy.invalid/'
      return new URL(url, dummyBase).href
    } catch {
      // Give up and return original
      return url
    }
  }

  // Match URL pattern with wildcard support
  function matchUrlPattern(pattern: string, url: string): boolean {
    if (pattern === '*://*/*') return true

    try {
      // Get base URL for relative path resolution
      let baseUrl = window.location.href
      // Handle special cases where window.location.href is not a valid base
      if (!baseUrl || baseUrl === 'about:blank' || baseUrl.startsWith('data:') || baseUrl.startsWith('blob:')) {
        baseUrl = 'https://dummy.invalid/'
      }

      const urlObj = new URL(url, baseUrl)
      const [schemePattern, ...hostPathParts] = pattern.split('://')
      const hostPath = hostPathParts.join('://')

      if (!hostPath) return false

      const hostPattern = hostPath.split('/')[0]
      const pathPattern = '/' + hostPath.split('/').slice(1).join('/')

      // Check scheme
      if (schemePattern !== '*' && schemePattern !== urlObj.protocol.replace(':', '')) {
        return false
      }

      // Check host
      if (hostPattern !== '*') {
        if (hostPattern.startsWith('*.')) {
          const domain = hostPattern.slice(2)
          if (!urlObj.hostname.endsWith('.' + domain) && urlObj.hostname !== domain) {
            return false
          }
        } else if (hostPattern !== urlObj.hostname) {
          return false
        }
      }

      // Check path
      if (pathPattern === '/*' || pathPattern === '/') {
        return true
      }

      // Escape special regex chars except * and convert * to .*
      let escapedPath = ''
      for (let k = 0; k < pathPattern.length; k++) {
        const ch = pathPattern.charAt(k)
        if (ch === '*') {
          escapedPath += '.*'
        } else if (ch === '.' || ch === '+' || ch === '?' || ch === '^' ||
                   ch === '$' || ch === '{' || ch === '}' || ch === '(' ||
                   ch === ')' || ch === '|') {
          escapedPath += '\\' + ch
        } else {
          escapedPath += ch
        }
      }
      const pathRegex = new RegExp('^' + escapedPath + '$')
      return pathRegex.test(urlObj.pathname)
    } catch (e) {
      console.error('[RequestRewrite] Pattern match error:', e, {
        pattern,
        url,
        baseUrl: window.location.href
      })
      return false
    }
  }

  // Find all rules matching the given URL and method
  function findMatchingRules(url: string, method: string): any[] {
    const matched: any[] = []
    const upperMethod = method.toUpperCase()

    for (let i = 0; i < currentRules.length; i++) {
      const rule = currentRules[i]
      if (!rule.enabled) continue
      if (!matchUrlPattern(rule.urlPattern, url)) continue

      // Check method match
      const methods = rule.methods || ['ALL']
      let methodMatch = false
      for (let j = 0; j < methods.length; j++) {
        if (methods[j] === 'ALL' || methods[j].toUpperCase() === upperMethod) {
          methodMatch = true
          break
        }
      }
      if (!methodMatch) continue

      matched.push(rule)
    }

    return matched
  }

  // Intercept fetch
  const originalFetch = window.fetch
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Extract URL and method
    let url: string, method: string, body: BodyInit | null

    if (typeof input === 'string') {
      url = normalizeUrl(input)
    } else if (input instanceof Request) {
      url = input.url
    } else if ((input as any).url) {
      url = (input as any).url
    } else {
      return originalFetch.call(window, input, init)
    }

    init = init || {}
    method = (init.method || 'GET').toUpperCase()
    body = init.body || null

    const rules = findMatchingRules(url, method)

    if (rules.length > 0) {
      // Process request-side rules
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]
        if (rule.target !== 'request') continue

        // GET params rewrite
        if (method === 'GET' && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
          const newUrl = rewriteGetParams(url, rule.bodyRewrites)
          if (newUrl !== url) {
            url = newUrl
            if (typeof input === 'string') {
              input = url
            } else if (input instanceof Request) {
              input = new Request(url, init)
            }
          }
        }

        // Body rewrite for non-GET requests
        if (body && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
          try {
            if (body instanceof FormData) {
              init.body = rewriteFormData(body, rule.bodyRewrites, url, method)
            } else if (typeof body === 'string') {
              init.body = applyRewrites(body, rule.bodyRewrites, url, method)
            } else {
              init.body = applyRewrites(String(body), rule.bodyRewrites, url, method)
            }
          } catch (e) {
            console.error('[RequestRewrite] Request body rewrite error:', e)
          }
        }
      }
    }

    // Call original fetch
    const fetchPromise = originalFetch.call(window, input, init)

    // Process response if there are response-side rules
    const responseRules = rules.filter(function(r) { return r.target === 'response' })

    if (responseRules.length > 0) {
      return fetchPromise.then(function(response) {
        const hasBodyRewrites = responseRules.some(function(r) {
          return r.bodyRewrites && r.bodyRewrites.length > 0
        })

        if (!hasBodyRewrites) return response

        return response.text().then(function(text) {
          let modifiedText = text

          for (let i = 0; i < responseRules.length; i++) {
            const rule = responseRules[i]
            if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
              modifiedText = applyRewrites(modifiedText, rule.bodyRewrites, url, method)
            }
          }

          return new Response(modifiedText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          })
        }).catch(function(e) {
          console.error('[RequestRewrite] Response body rewrite error:', e)
          return response
        })
      })
    }

    return fetchPromise
  }

  // Intercept XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest
  ;(window as any).XMLHttpRequest = function() {
    const xhr = new (OriginalXHR as any)()
    let _url: string, _method: string, _body: any
    let _rules: any[] = []

    // Intercept open
    const originalOpen = xhr.open
    xhr.open = function(method: string, url: string) {
      _method = method
      _url = normalizeUrl(url)
      _rules = findMatchingRules(_url, _method)

      // Apply GET params rewrite before opening
      const requestRules = _rules.filter(function(r) { return r.target === 'request' })
      if (requestRules.length > 0 && _method.toUpperCase() === 'GET') {
        for (let i = 0; i < requestRules.length; i++) {
          const rule = requestRules[i]
          if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
            const newUrl = rewriteGetParams(_url, rule.bodyRewrites)
            if (newUrl !== _url) {
              _url = newUrl
            }
          }
        }
      }

      const args = Array.from(arguments)
      args[1] = _url
      return originalOpen.apply(xhr, args)
    }

    // Intercept send
    const originalSend = xhr.send
    xhr.send = function(body?: any) {
      _body = body

      // Apply request body rewrite
      const requestRules = _rules.filter(function(r) { return r.target === 'request' })
      if (requestRules.length > 0 && _body) {
        for (let i = 0; i < requestRules.length; i++) {
          const rule = requestRules[i]
          if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
            try {
              if (_body instanceof FormData) {
                _body = rewriteFormData(_body, rule.bodyRewrites, _url, _method)
              } else if (typeof _body === 'string') {
                _body = applyRewrites(_body, rule.bodyRewrites, _url, _method)
              } else {
                _body = applyRewrites(String(_body), rule.bodyRewrites, _url, _method)
              }
            } catch (e) {
              console.error('[RequestRewrite] XHR request body rewrite error:', e)
            }
          }
        }
      }

      // Intercept response
      const responseRules = _rules.filter(function(r) { return r.target === 'response' })
      if (responseRules.length > 0) {
        xhr.addEventListener('load', function() {
          let modifiedText = xhr.responseText

          for (let i = 0; i < responseRules.length; i++) {
            const rule = responseRules[i]
            if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
              try {
                modifiedText = applyRewrites(modifiedText, rule.bodyRewrites, _url, _method)
              } catch (e) {
                console.error('[RequestRewrite] XHR response rewrite error:', e)
              }
            }
          }

          try {
            Object.defineProperty(xhr, 'responseText', {
              value: modifiedText,
              writable: false,
              configurable: true
            })
            Object.defineProperty(xhr, 'response', {
              value: modifiedText,
              writable: false,
              configurable: true
            })
          } catch (e) {
            console.warn('[RequestRewrite] Could not override XHR response:', e)
          }
        })
      }

      return originalSend.call(xhr, _body)
    }

    return xhr
  }

  console.log('[RequestRewrite] Injected script loaded, intercepting fetch/XHR')
})()