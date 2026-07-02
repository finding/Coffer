# Task 6 Report: Injected Script for Fetch/XHR Interception

## Status: DONE

## Summary
Successfully created the injected script (`src/content/injectedScript.ts`) that intercepts fetch and XMLHttpRequest for request/response body rewriting. The script is exported as a string constant that will be injected into page context via a content script.

## Files Created

1. **`src/content/injectedScript.ts`**
   - Exports `INJECTED_SCRIPT` string constant
   - Contains self-contained JavaScript (no imports allowed)
   - Runs in page context, NOT extension context

## Files Modified (Bonus)

1. **`src/content/bodyRewriter.ts`**
   - Fixed ES compatibility: replaced `replaceAll` with `split/join`
   - Required for TypeScript build to pass (target lib issue)

## Key Interception Patterns Implemented

### Communication Protocol
- `window.postMessage` for bidirectional communication with content script
- `REQUEST_REWRITE_CONFIG`: Receives rules and variables from content script
- `REQUEST_REWRITE_GET_CONFIG`: Requests configuration on startup

### Variable Resolution
- `applyVariables(value)`: Replaces `{{varName}}` patterns with values from `variableMap`

### Body Rewrite Methods (Inline Implementation)
- `text`: Simple text find/replace using `split/join`
- `jsonPath`: JSON path modification with `setByPath()`
- `regex`: Regular expression replacement
- `script`: Custom JavaScript function execution

### URL Pattern Matching
- `matchUrlPattern(pattern, url)`: Wildcard matching for `*://api.example.com/*`
- Supports scheme wildcards (`*://`)
- Supports subdomain wildcards (`*.example.com`)
- Supports path wildcards (`/*`)

### Fetch Interception
- Intercept `window.fetch` wrapper
- Request side: URL rewrite (GET params) and body rewrite
- Response side: Create new Response with modified body text

### XMLHttpRequest Interception
- Intercept `window.XMLHttpRequest` constructor
- Intercept `xhr.open`: URL modification before opening connection
- Intercept `xhr.send`: Body modification before sending
- Intercept `xhr.load`: Override `responseText` and `response` properties

### Error Handling
- All errors caught and logged, never interrupt user requests
- Individual rewrite failures logged but execution continues
- Invalid JSON/regex patterns handled gracefully

## Commits Made

1. **`11d8d66`**: feat: add injected script for fetch/XHR interception
   - Created `src/content/injectedScript.ts`
   - Fixed `bodyRewriter.ts` ES compatibility

## Build Verification

- TypeScript compiles without errors
- `npm run build` passes successfully
- All 40 bodyRewriter tests pass

## Concerns

1. **XHR Response Override Limitation**: The `Object.defineProperty` approach for overriding `responseText` may not work in all browsers or if the property was already defined. This is a known limitation of XHR interception.

2. **Template String Escaping**: The backslash escaping in the template string is complex. The regex escaping for path patterns uses explicit character-by-character handling to avoid issues.

3. **No Imports**: The injected script must duplicate all logic inline since it cannot import from the extension context. This means future changes to bodyRewriter logic must be manually synchronized.