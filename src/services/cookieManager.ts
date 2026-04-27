import type { CookieItem, CookieAttribute } from '@/types'

export class CookieManager {
  async getCookies(params: { domain?: string; url?: string }): Promise<CookieItem[]> {
    const query: chrome.cookies.GetAllDetails = {}
    if (params.domain) query.domain = params.domain
    if (params.url) query.url = params.url

    const cookies = await chrome.cookies.getAll(query)
    return cookies.map(this.mapChromeCookie)
  }

  async setCookie(cookie: CookieItem, url: string): Promise<CookieItem | null> {
    const result = await chrome.cookies.set({
      url, name: cookie.name, value: cookie.value,
      domain: cookie.domain, path: cookie.path,
      secure: cookie.secure, httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite, expirationDate: cookie.expirationDate,
      storeId: cookie.storeId
    })
    return result ? this.mapChromeCookie(result) : null
  }

  async removeCookie(params: { url: string; name: string }): Promise<boolean> {
    const result = await chrome.cookies.remove(params)
    return result !== null
  }

  async setCookies(cookies: CookieItem[], targetUrl: string): Promise<void> {
    for (const cookie of cookies) {
      await this.setCookie(cookie, targetUrl)
    }
  }

  async removeCookies(cookies: { url: string; name: string }[]): Promise<void> {
    for (const c of cookies) {
      await this.removeCookie(c)
    }
  }

  filterByAttributes(cookies: CookieItem[], attributes: CookieAttribute[]): CookieItem[] {
    return cookies.filter(c => attributes.every(attr => {
      if (attr === 'secure') return c.secure
      if (attr === 'httpOnly') return c.httpOnly
      if (attr === 'session') return !c.expirationDate
      return true
    }))
  }

  filterByKeyword(cookies: CookieItem[], keyword: string): CookieItem[] {
    if (!keyword) return cookies
    const k = keyword.toLowerCase()
    return cookies.filter(c =>
      c.name.toLowerCase().includes(k) ||
      c.value.toLowerCase().includes(k) ||
      c.domain.toLowerCase().includes(k)
    )
  }

  filterByTimeRange(cookies: CookieItem[], timeRange: { start: number; end: number } | null): CookieItem[] {
    if (!timeRange) return cookies
    return cookies.filter(c => c.expirationDate && c.expirationDate >= timeRange.start && c.expirationDate <= timeRange.end)
  }

  groupByDomain(cookies: CookieItem[]): Map<string, CookieItem[]> {
    const grouped = new Map<string, CookieItem[]>()
    for (const c of cookies) {
      if (!grouped.has(c.domain)) grouped.set(c.domain, [])
      grouped.get(c.domain)!.push(c)
    }
    return grouped
  }

  private mapChromeCookie(c: chrome.cookies.Cookie): CookieItem {
    return {
      name: c.name, value: c.value, domain: c.domain, path: c.path,
      secure: c.secure, httpOnly: c.httpOnly,
      sameSite: c.sameSite as CookieItem['sameSite'],
      expirationDate: c.expirationDate, storeId: c.storeId
    }
  }
}

export const cookieManager = new CookieManager()
