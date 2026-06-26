// src/content/injectedScript.ts

// This file exports a string constant that will be injected into page context
// IMPORTANT: Cannot use imports - all code must be inline and self-contained
// The script runs in page context, NOT extension context

export const INJECTED_SCRIPT = `
(function() {
  'use strict'

  // Rules and variables storage
  let currentRules = []
  let variableMap = new Map()

  // Listen for config from content script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return
    if (event.data.type === 'REQUEST_REWRITE_CONFIG') {
      currentRules = event.data.rules || []
      variableMap = new Map(Object.entries(event.data.variables || {}))
      console.log('[RequestRewrite] Received config:', currentRules.length, 'rules')
    }
  })

  // Request config from content script
  window.postMessage({ type: 'REQUEST_REWRITE_GET_CONFIG' }, '*')

  // Apply variables to a string value
  // Replaces {{varName}} patterns with values from variableMap
  function applyVariables(value) {
    if (typeof value !== 'string') return value
    return value.replace(/\\{\\{(\\w+)\\}\\}/g, function(_, name) {
      return variableMap.get(name) || ''
    })
  }

  // Set a value in a JSON object by dot-notation path
  // Creates nested objects if path doesn't exist
  function setByPath(obj, path, value) {
    var parts = path.split('.')
    var current = obj

    for (var i = 0; i < parts.length - 1; i++) {
      var part = parts[i]
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }

    current[parts[parts.length - 1]] = value
  }

  // Apply a single rewrite operation to the body
  function applySingleRewrite(body, rewrite, url, method) {
    try {
      switch (rewrite.method) {
        case 'text': {
          if (!rewrite.find) return body
          // Use split/join for ES5 compatibility instead of replaceAll
          return body.split(rewrite.find).join(rewrite.replace || '')
        }

        case 'jsonPath': {
          if (!rewrite.path || rewrite.value === undefined) return body
          var json = JSON.parse(body)
          var resolvedValue = applyVariables(rewrite.value)
          setByPath(json, rewrite.path, resolvedValue)
          return JSON.stringify(json)
        }

        case 'regex': {
          if (!rewrite.pattern) return body
          var regex = new RegExp(rewrite.pattern, 'g')
          return body.replace(regex, rewrite.replacement || '')
        }

        case 'script': {
          if (!rewrite.scriptBody) return body
          // Create a function that takes body, url, method and returns modified body
          try {
            var modifyFn = new Function('body', 'url', 'method', rewrite.scriptBody)
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
      return body // Return current body, continue with subsequent rewrites
    }
  }

  // Apply multiple rewrite operations to the request body
  // Operations are applied in sequence
  function applyRewrites(body, rewrites, url, method) {
    var result = body
    for (var i = 0; i < rewrites.length; i++) {
      result = applySingleRewrite(result, rewrites[i], url, method)
    }
    return result
  }

  // Apply rewrites to FormData
  // Returns a new FormData with modified string values
  function rewriteFormData(formData, rewrites, url, method) {
    var newFormData = new FormData()

    // Process each entry
    var entries = []
    try {
      entries = Array.from(formData.entries())
    } catch (e) {
      // Fallback for older browsers
      return formData
    }

    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0]
      var value = entries[i][1]

      if (typeof value === 'string') {
        var modifiedValue = value

        for (var j = 0; j < rewrites.length; j++) {
          var rewrite = rewrites[j]
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
                  var regex = new RegExp(rewrite.pattern, 'g')
                  modifiedValue = modifiedValue.replace(regex, rewrite.replacement || '')
                }
                break
              }
              case 'script': {
                if (rewrite.scriptBody) {
                  var modifyFn = new Function('value', 'key', 'url', 'method', rewrite.scriptBody)
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
        // Keep File/Blob unchanged
        newFormData.set(key, value)
      }
    }

    return newFormData
  }

  // Rewrite GET request query parameters
  function rewriteGetParams(url, rewrites) {
    var parts = url.split('?')
    if (parts.length < 2) return url

    var baseUrl = parts[0]
    var queryString = parts.slice(1).join('?')

    for (var i = 0; i < rewrites.length; i++) {
      var rewrite = rewrites[i]
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
              var regex = new RegExp(rewrite.pattern, 'g')
              queryString = queryString.replace(regex, rewrite.replacement || '')
            }
            break
          }

          case 'jsonPath': {
            // jsonPath is used to modify individual query parameters
            if (rewrite.path) {
              var params = new URLSearchParams(queryString)
              if (params.has(rewrite.path)) {
                params.set(rewrite.path, applyVariables(rewrite.value || ''))
              }
              queryString = params.toString()
            }
            break
          }

          case 'script': {
            if (rewrite.scriptBody) {
              var params = new URLSearchParams(queryString)
              var modifyFn = new Function('params', 'url', rewrite.scriptBody)
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

  // Match URL pattern with wildcard support
  // Supports patterns like: *://api.example.com/*, https://*.example.com/path
  function matchUrlPattern(pattern, url) {
    // Fast path for catch-all
    if (pattern === '*://*/*') return true

    try {
      var urlObj = new URL(url)
      var schemePattern = pattern.split('://')[0]
      var hostPath = pattern.split('://')[1]

      if (!hostPath) return false

      var hostPattern = hostPath.split('/')[0]
      var pathPattern = '/' + hostPath.split('/').slice(1).join('/')

      // Check scheme
      if (schemePattern !== '*' && schemePattern !== urlObj.protocol.replace(':', '')) {
        return false
      }

      // Check host
      if (hostPattern !== '*') {
        if (hostPattern.startsWith('*.')) {
          // Wildcard subdomain matching
          var domain = hostPattern.slice(2)
          if (!urlObj.hostname.endsWith('.' + domain) && urlObj.hostname !== domain) {
            return false
          }
        } else if (hostPattern !== urlObj.hostname) {
          return false
        }
      }

      // Check path - convert wildcard to regex
      if (pathPattern === '/*' || pathPattern === '/') {
        return true
      }

      // Escape special regex chars except * and convert * to .*
      // URL patterns typically use only: alphanumeric, /, -, _, ., and *
      // We escape: . + ? ^ $ { } ( ) |
      var escapedPath = ''
      for (var k = 0; k < pathPattern.length; k++) {
        var ch = pathPattern.charAt(k)
        if (ch === '*') {
          escapedPath += '.*'
        } else if (ch === '.' || ch === '+' || ch === '?' || ch === '^' ||
                   ch === '$' || ch === '{' || ch === '}' || ch === '(' ||
                   ch === ')' || ch === '|') {
          escapedPath += '\\\\' + ch
        } else {
          escapedPath += ch
        }
      }
      var pathRegex = new RegExp('^' + escapedPath + '$')
      return pathRegex.test(urlObj.pathname)
    } catch (e) {
      console.error('[RequestRewrite] Pattern match error:', e)
      return false
    }
  }

  // Find all rules matching the given URL and method
  function findMatchingRules(url, method) {
    var matched = []
    var upperMethod = method.toUpperCase()

    for (var i = 0; i < currentRules.length; i++) {
      var rule = currentRules[i]
      if (!rule.enabled) continue
      if (!matchUrlPattern(rule.urlPattern, url)) continue

      // Check method match
      var methods = rule.methods || ['ALL']
      var methodMatch = false
      for (var j = 0; j < methods.length; j++) {
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
  var originalFetch = window.fetch
  window.fetch = function(input, init) {
    // Extract URL and method
    var url, method, body
    if (typeof input === 'string') {
      url = input
    } else if (input && input.url) {
      url = input.url
    } else if (input && input instanceof Request) {
      url = input.url
    }

    init = init || {}
    method = (init.method || 'GET').toUpperCase()
    body = init.body

    var rules = findMatchingRules(url, method)

    if (rules.length > 0) {
      // Process request-side rules
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i]
        if (rule.target !== 'request') continue

        // GET params rewrite
        if (method === 'GET' && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
          var newUrl = rewriteGetParams(url, rule.bodyRewrites)
          if (newUrl !== url) {
            url = newUrl
            if (typeof input === 'string') {
              input = url
            } else if (input && input instanceof Request) {
              // Create new Request with modified URL
              input = new Request(url, init)
            }
          }
        }

        // Body rewrite for non-GET requests
        if (body && rule.bodyRewrites && rule.bodyRewrites.length > 0) {
          try {
            // Check if body is FormData
            if (body instanceof FormData) {
              init.body = rewriteFormData(body, rule.bodyRewrites, url, method)
            } else if (typeof body === 'string') {
              init.body = applyRewrites(body, rule.bodyRewrites, url, method)
            } else {
              // Try to convert to string for other types (URLSearchParams, etc)
              init.body = applyRewrites(String(body), rule.bodyRewrites, url, method)
            }
          } catch (e) {
            console.error('[RequestRewrite] Request body rewrite error:', e)
          }
        }
      }
    }

    // Call original fetch
    var fetchPromise = originalFetch.call(window, input, init)

    // Process response if there are response-side rules
    var responseRules = rules.filter(function(r) { return r.target === 'response' })

    if (responseRules.length > 0) {
      return fetchPromise.then(function(response) {
        // Only process if there are body rewrites for response
        var hasBodyRewrites = responseRules.some(function(r) {
          return r.bodyRewrites && r.bodyRewrites.length > 0
        })

        if (!hasBodyRewrites) return response

        // Clone response and modify body
        return response.text().then(function(text) {
          var modifiedText = text

          for (var i = 0; i < responseRules.length; i++) {
            var rule = responseRules[i]
            if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
              modifiedText = applyRewrites(modifiedText, rule.bodyRewrites, url, method)
            }
          }

          // Create new response with modified body
          return new Response(modifiedText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          })
        }).catch(function(e) {
          console.error('[RequestRewrite] Response body rewrite error:', e)
          return response // Return original on error
        })
      })
    }

    return fetchPromise
  }

  // Intercept XMLHttpRequest
  var OriginalXHR = window.XMLHttpRequest
  window.XMLHttpRequest = function() {
    var xhr = new OriginalXHR()
    var _url, _method, _body
    var _rules = []

    // Intercept open
    var originalOpen = xhr.open
    xhr.open = function(method, url) {
      _method = method
      _url = url
      _rules = findMatchingRules(_url, _method)

      // Apply GET params rewrite before opening
      var requestRules = _rules.filter(function(r) { return r.target === 'request' })
      if (requestRules.length > 0 && _method.toUpperCase() === 'GET') {
        for (var i = 0; i < requestRules.length; i++) {
          var rule = requestRules[i]
          if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
            var newUrl = rewriteGetParams(_url, rule.bodyRewrites)
            if (newUrl !== _url) {
              _url = newUrl
            }
          }
        }
      }

      return originalOpen.apply(xhr, Array.prototype.slice.call(arguments).slice(0, 2).concat([_url]).concat(Array.prototype.slice.call(arguments).slice(2)))
    }

    // Intercept send
    var originalSend = xhr.send
    xhr.send = function(body) {
      _body = body

      // Apply request body rewrite
      var requestRules = _rules.filter(function(r) { return r.target === 'request' })
      if (requestRules.length > 0 && _body) {
        for (var i = 0; i < requestRules.length; i++) {
          var rule = requestRules[i]
          if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
            try {
              // Check if body is FormData
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
      var responseRules = _rules.filter(function(r) { return r.target === 'response' })
      if (responseRules.length > 0) {
        xhr.addEventListener('load', function() {
          var modifiedText = xhr.responseText

          for (var i = 0; i < responseRules.length; i++) {
            var rule = responseRules[i]
            if (rule.bodyRewrites && rule.bodyRewrites.length > 0) {
              try {
                modifiedText = applyRewrites(modifiedText, rule.bodyRewrites, _url, _method)
              } catch (e) {
                console.error('[RequestRewrite] XHR response rewrite error:', e)
              }
            }
          }

          // Override response properties
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
`
