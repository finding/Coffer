// src/services/headerRuleService.ts

import type { RequestRewriteProfile, RequestRewriteRule } from '@/types'
import { requestRewriteStorage } from './requestRewriteStorage'

// Legacy types for backward compatibility
type LegacyHeaderRule = {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL')[]
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
  target: 'request' | 'response'
}

type LegacyHeaderProfile = {
  id: string
  name: string
  enabled: boolean
  rules: LegacyHeaderRule[]
}

export class HeaderRuleService {
  private ruleIdCounter = 1

  /**
   * Sync rules to Chrome declarativeNetRequest
   * Supports both old HeaderProfile and new RequestRewriteProfile formats
   */
  async syncRulesToChrome(profile: LegacyHeaderProfile | RequestRewriteProfile | null): Promise<void> {
    await this.clearAllRules()

    if (!profile || !profile.enabled) return

    const enabledRules = profile.rules.filter(r => r.enabled)

    // Check if this is the new format (has headers array) or old format (has direct header properties)
    const firstRule = enabledRules[0] as LegacyHeaderRule | RequestRewriteRule
    const isNewFormat = firstRule && 'headers' in firstRule

    if (isNewFormat) {
      const chromeRules = this.convertNewFormatToChromeRules(enabledRules as RequestRewriteRule[])
      if (chromeRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: chromeRules as chrome.declarativeNetRequest.Rule[]
        })
      }
    } else {
      const chromeRules = this.convertToChromeRules(enabledRules as LegacyHeaderRule[])
      if (chromeRules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: chromeRules as chrome.declarativeNetRequest.Rule[]
        })
      }
    }
  }

  /**
   * Convert old format HeaderRule to Chrome rules
   */
  convertToChromeRules(rules: LegacyHeaderRule[]): chrome.declarativeNetRequest.Rule[] {
    return rules.map((rule, index) => this.convertSingleRule(rule, index)) as chrome.declarativeNetRequest.Rule[]
  }

  /**
   * Convert new format RequestRewriteRule to Chrome rules
   * Each rule with multiple headers expands to multiple Chrome rules
   */
  convertNewFormatToChromeRules(rules: RequestRewriteRule[]): chrome.declarativeNetRequest.Rule[] {
    const chromeRules: chrome.declarativeNetRequest.Rule[] = []
    let ruleIndex = 0

    for (const rule of rules) {
      if (!rule.headers || rule.headers.length === 0) continue

      for (const headerAction of rule.headers) {
        // Skip empty header names
        if (!headerAction.headerName || !headerAction.headerName.trim()) continue

        const chromeRule = this.convertNewRuleToChromeRule(rule, headerAction, ruleIndex++)
        chromeRules.push(chromeRule as chrome.declarativeNetRequest.Rule)
      }
    }

    return chromeRules
  }

  /**
   * Convert a single old format rule to Chrome rule
   */
  private convertSingleRule(rule: LegacyHeaderRule, index: number) {
    const chromeRuleId = this.ruleIdCounter++

    const headerInfo = {
      header: rule.headerName,
      operation: this.getOperation(rule.action),
      value: rule.action !== 'remove' ? rule.headerValue : undefined
    }

    const requestMethods = rule.methods.includes('ALL')
      ? undefined
      : rule.methods.map(m => m.toLowerCase())

    return {
      id: chromeRuleId,
      priority: 1000 - index,
      action: {
        type: rule.action === 'remove' ? 'removeHeaders' : 'modifyHeaders',
        requestHeaders: rule.target === 'request' ? [headerInfo] : undefined,
        responseHeaders: rule.target === 'response' ? [headerInfo] : undefined
      },
      condition: {
        urlFilter: rule.urlPattern,
        requestMethods,
        resourceTypes: ['xmlhttprequest', 'script', 'image', 'stylesheet', 'media', 'font', 'main_frame', 'sub_frame', 'other']
      }
    }
  }

  /**
   * Convert a single new format rule header action to Chrome rule
   */
  private convertNewRuleToChromeRule(
    rule: RequestRewriteRule,
    headerAction: { action: 'add' | 'modify' | 'remove'; headerName: string; headerValue: string },
    index: number
  ) {
    const chromeRuleId = this.ruleIdCounter++

    const headerInfo = {
      header: headerAction.headerName,
      operation: this.getOperation(headerAction.action),
      value: headerAction.action !== 'remove' ? headerAction.headerValue : undefined
    }

    const requestMethods = rule.methods.includes('ALL')
      ? undefined
      : rule.methods.map(m => m.toLowerCase())

    return {
      id: chromeRuleId,
      priority: 1000 - index,
      action: {
        type: headerAction.action === 'remove' ? 'removeHeaders' : 'modifyHeaders',
        requestHeaders: rule.target === 'request' ? [headerInfo] : undefined,
        responseHeaders: rule.target === 'response' ? [headerInfo] : undefined
      },
      condition: {
        urlFilter: rule.urlPattern,
        requestMethods,
        resourceTypes: ['xmlhttprequest', 'script', 'image', 'stylesheet', 'media', 'font', 'main_frame', 'sub_frame', 'other']
      }
    }
  }

  private getOperation(action: 'add' | 'modify' | 'remove') {
    switch (action) {
      case 'add': return 'set'
      case 'modify': return 'set'
      case 'remove': return 'remove'
    }
  }

  async clearAllRules(): Promise<void> {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    if (existingRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map(r => r.id)
      })
    }
    this.ruleIdCounter = 1
  }

  async initialize(): Promise<void> {
    const activeProfile = await requestRewriteStorage.getActiveProfile()
    if (activeProfile) {
      await this.syncRulesToChrome(activeProfile)
    }
  }
}

export const headerRuleService = new HeaderRuleService()