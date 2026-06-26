// src/content/index.ts

import { INJECTED_SCRIPT } from './injectedScript'

/**
 * Inject the script string into page context via a script element.
 * This allows the injected script to run in the page's JavaScript context,
 * giving it access to intercept fetch and XMLHttpRequest.
 */
function injectScript(): void {
  const script = document.createElement('script')
  script.textContent = INJECTED_SCRIPT
  ;(document.head || document.documentElement).appendChild(script)
  script.remove()
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
