// src/types/headerRule.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'

export type HeaderTarget = 'request' | 'response'

export type HeaderAction = 'add' | 'modify' | 'remove'

export interface HeaderRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  action: HeaderAction
  headerName: string
  headerValue: string
  target: HeaderTarget
}

export interface HeaderProfile {
  id: string
  name: string
  enabled: boolean
  rules: HeaderRule[]
}

export interface HeaderProfilesExport {
  version: string
  profiles: HeaderProfile[]
}