import { config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

config.global.plugins = []

beforeEach(() => {
  setActivePinia(createPinia())
})

const mockChrome = {
  cookies: {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn()
  },
  runtime: {
    onMessage: {
      addListener: vi.fn()
    },
    sendMessage: vi.fn()
  }
}

vi.stubGlobal('chrome', mockChrome)
