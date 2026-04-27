import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CookieItem, CookieFilters, CookieAttribute } from '@/types'
import { cookieManager } from '@/services/cookieManager'

export const useCookieStore = defineStore('cookies', () => {
  const cookies = ref<CookieItem[]>([])
  const currentDomain = ref<string>('')
  const filters = ref<CookieFilters>({
    keyword: '', domain: '', attributes: [], timeRange: null
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filteredCookies = computed(() => {
    let result = cookies.value
    if (filters.value.keyword) {
      result = cookieManager.filterByKeyword(result, filters.value.keyword)
    }
    if (filters.value.attributes.length > 0) {
      result = cookieManager.filterByAttributes(result, filters.value.attributes as CookieAttribute[])
    }
    if (filters.value.timeRange) {
      result = cookieManager.filterByTimeRange(result, filters.value.timeRange)
    }
    return result
  })

  const groupedByDomain = computed(() => cookieManager.groupByDomain(filteredCookies.value))
  const cookieCount = computed(() => cookies.value.length)

  async function loadCookies(domain: string): Promise<void> {
    loading.value = true
    error.value = null
    currentDomain.value = domain
    try {
      cookies.value = await cookieManager.getCookies({ domain })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load cookies'
    } finally {
      loading.value = false
    }
  }

  async function deleteCookie(url: string, name: string): Promise<void> {
    await cookieManager.removeCookie({ url, name })
    cookies.value = cookies.value.filter(c => c.name !== name)
  }

  async function deleteAllCookies(): Promise<void> {
    const url = `https://${currentDomain.value}`
    for (const c of cookies.value) {
      await cookieManager.removeCookie({ url, name: c.name })
    }
    cookies.value = []
  }

  function resetFilters(): void {
    filters.value = { keyword: '', domain: '', attributes: [], timeRange: null }
  }

  return {
    cookies, currentDomain, filters, loading, error,
    filteredCookies, groupedByDomain, cookieCount,
    loadCookies, deleteCookie, deleteAllCookies, resetFilters
  }
})