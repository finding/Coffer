import type { CookieItem, ClipboardItem } from '@/types'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export class ClipboardService {
  copy(cookies: CookieItem[], sourceDomain: string, label?: string): ClipboardItem {
    return {
      cookies: [...cookies],
      sourceDomain,
      copiedAt: Date.now(),
      label
    }
  }

  validateForPaste(item: ClipboardItem | null): ValidationResult {
    if (!item) return { valid: false, error: 'No item in clipboard' }
    if (!item.cookies || item.cookies.length === 0) return { valid: false, error: 'No cookies to paste' }
    return { valid: true }
  }

  transformForDomain(cookies: CookieItem[], targetDomain: string): CookieItem[] {
    return cookies.map(c => ({ ...c, domain: targetDomain }))
  }

  mergeClipboardItems(items: ClipboardItem[], maxItems: number): ClipboardItem[] {
    return [...items].sort((a, b) => b.copiedAt - a.copiedAt).slice(0, maxItems)
  }
}

export const clipboardService = new ClipboardService()