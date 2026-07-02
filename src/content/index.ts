// src/content/index.ts

/**
 * Inject the external script into page context via a script element with src.
 * This approach bypasses CSP restrictions that block inline scripts.
 */
function injectScript(): void {
  const script = document.createElement('script')
  // Use external script file to bypass CSP inline-script restrictions
  script.src = chrome.runtime.getURL('injected.js')
  script.onload = function() {
    script.remove()
  }
  ;(document.head || document.documentElement).appendChild(script)
}

/**
 * Fetch rules and variables from the background script.
 * On success, forwards the config to the injected script via postMessage.
 */
async function fetchRules(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getRequestRewriteRules' })
    if (response?.success && response?.data) {
      // Send config to injected script
      window.postMessage({
        type: 'REQUEST_REWRITE_CONFIG',
        rules: response.data.rules,
        variables: response.data.variables
      }, '*')
    }
  } catch (e) {
    console.error('[ContentScript] Failed to fetch rules:', e)
  }
}

/**
 * Listen for config requests from the injected script.
 * The injected script sends REQUEST_REWRITE_GET_CONFIG when it loads.
 */
window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return

  if (event.data.type === 'REQUEST_REWRITE_GET_CONFIG') {
    fetchRules()
  }
})

/**
 * Listen for rule updates from the background script.
 * When rules are updated, re-fetch and forward to injected script.
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'REQUEST_REWRITE_RULES_UPDATED') {
    fetchRules()
  }
})

// Initialize: inject the page script
injectScript()
console.log('[ContentScript] RequestRewrite content script loaded')