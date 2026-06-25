# Task 3: Header 规则核心服务

**Goal:** Create service to sync header rules to Chrome declarativeNetRequest API.

## Files to Create

- Create: `src/services/headerRuleService.ts`

## Dependencies

This task depends on:
- `src/types/headerRule.ts` (from Task 1/2)
- `src/services/headerRuleStorage.ts` (from Task 2)

## Implementation

```typescript
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
        addRules: chromeRules
      })
    }
  }

  convertToChromeRules(rules: HeaderRule[]): chrome.declarativeNetRequest.Rule[] {
    return rules.map((rule, index) => this.convertSingleRule(rule, index))
  }

  private convertSingleRule(rule: HeaderRule, index: number): chrome.declarativeNetRequest.Rule {
    const chromeRuleId = this.ruleIdCounter++
    
    const headerInfo: chrome.declarativeNetRequest.ModifyHeaderInfo = {
      header: rule.headerName,
      operation: this.getOperation(rule.action),
      value: rule.action !== 'remove' ? rule.headerValue : undefined
    }

    const requestMethods = rule.methods.includes('ALL') 
      ? undefined 
      : rule.methods.map(m => m.toLowerCase() as chrome.declarativeNetRequest.RequestMethod)

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
        resourceTypes: ['xmlhttprequest', 'script', 'image', 'stylesheet', 'media', 'font', 'document', 'other']
      }
    }
  }

  private getOperation(action: 'add' | 'modify' | 'remove'): chrome.declarativeNetRequest.HeaderOperation {
    switch (action) {
      case 'add': return 'append'
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
```

## Commit

```bash
git add src/services/headerRuleService.ts
git commit -m "feat: add header rule service with Chrome API sync

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```