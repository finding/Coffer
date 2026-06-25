// src/services/headerRuleService.ts

import type { HeaderRule, HeaderProfile } from '@/types'
import { headerRuleStorage } from './headerRuleStorage'

export class HeaderRuleService {
  private ruleIdCounter = 1

  async syncRulesToChrome(profile: HeaderProfile | null): Promise<void> {
    await this.clearAllRules()

    if (!profile || !profile.enabled) return

    const enabledRules = profile.rules.filter(r => r.enabled)
    const chromeRules = this.convertToChromeRules(enabledRules)

    if (chromeRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: chromeRules as chrome.declarativeNetRequest.Rule[]
      })
    }
  }

  convertToChromeRules(rules: HeaderRule[]): chrome.declarativeNetRequest.Rule[] {
    return rules.map((rule, index) => this.convertSingleRule(rule, index)) as chrome.declarativeNetRequest.Rule[]
  }

  private convertSingleRule(rule: HeaderRule, index: number) {
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
    const activeProfile = await headerRuleStorage.getActiveProfile()
    if (activeProfile) {
      await this.syncRulesToChrome(activeProfile)
    }
  }
}

export const headerRuleService = new HeaderRuleService()