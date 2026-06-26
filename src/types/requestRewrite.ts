// src/types/requestRewrite.ts

/**
 * HTTP Methods for request matching
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'

/**
 * Header target - request or response
 */
export type HeaderTarget = 'request' | 'response'

/**
 * Methods for body rewriting
 */
export type BodyRewriteMethod = 'text' | 'jsonPath' | 'regex' | 'script'

/**
 * HeaderRuleAction - Defines a single header modification action
 */
export interface HeaderRuleAction {
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
}

/**
 * BodyRewriteAction - Defines a single body rewrite operation
 *
 * - text: Simple text find/replace
 * - jsonPath: JSONPath-based value replacement
 * - regex: Regular expression-based replacement
 * - script: Custom JavaScript for body transformation
 */
export interface BodyRewriteAction {
  method: BodyRewriteMethod
  // text method
  find?: string
  replace?: string
  // jsonPath method
  path?: string
  value?: string
  // regex method
  pattern?: string
  replacement?: string
  // script method
  scriptBody?: string
}

/**
 * RequestRewriteRule - A complete rewrite rule
 *
 * Supports multiple header actions and body rewrites that execute in order.
 */
export interface RequestRewriteRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  target: HeaderTarget
  headers: HeaderRuleAction[]
  bodyRewrites: BodyRewriteAction[]
}

/**
 * RequestRewriteProfile - A collection of rewrite rules
 */
export interface RequestRewriteProfile {
  id: string
  name: string
  enabled: boolean
  rules: RequestRewriteRule[]
}

/**
 * LegacyHeaderRule - Old single-action header rule format (for migration)
 */
export interface LegacyHeaderRule {
  id: string
  enabled: boolean
  name: string
  urlPattern: string
  methods: HttpMethod[]
  action: 'add' | 'modify' | 'remove'
  headerName: string
  headerValue: string
  target: HeaderTarget
}

/**
 * LegacyHeaderProfile - Old profile format (for migration)
 */
export interface LegacyHeaderProfile {
  id: string
  name: string
  enabled: boolean
  rules: LegacyHeaderRule[]
}

/**
 * RequestRewriteProfilesExport - Export format for profiles
 */
export interface RequestRewriteProfilesExport {
  version: string
  profiles: RequestRewriteProfile[]
}

/**
 * Legacy type aliases for backward compatibility
 * @deprecated Use RequestRewriteRule instead
 */
export type HeaderRule = LegacyHeaderRule

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use RequestRewriteProfile instead
 */
export type HeaderProfile = LegacyHeaderProfile

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use RequestRewriteProfilesExport instead
 */
export type HeaderProfilesExport = RequestRewriteProfilesExport

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use HeaderRuleAction instead
 */
export type HeaderAction = 'add' | 'modify' | 'remove'