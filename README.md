# Coffer

[中文文档](./README_CN.md) | English

A secure vault for your cookies and storage data - manage, copy, paste across tabs and incognito mode.

## Features

### Cookie Management
- **View & Edit**: Inspect all cookies with detailed information (name, value, domain, path, secure, httpOnly, expiration)
- **Copy & Paste**: Copy cookies from one domain and paste to another, works across tabs and incognito mode
- **Batch Operations**: Select multiple cookies for batch copy, delete, or export
- **Import & Export**: Import/export cookies in JSON format
- **Click to Copy**: Click on cookie name or value to copy to clipboard

### Storage Management
- **LocalStorage & SessionStorage**: Full support for both storage types
- **View & Edit**: Inspect and modify storage key-value pairs
- **Copy & Paste**: Copy storage items between different pages or tabs
- **Isolated Clipboard**: LocalStorage and SessionStorage clipboards are stored separately
- **Batch Operations**: Select multiple items for batch operations
- **Import & Export**: Import/export storage data in JSON format

### User Interface
- **Popup**: Quick actions for current tab (copy all, paste, delete all, import/export)
- **Manager Page**: Full-featured management interface with tabs for Cookies/LocalStorage/SessionStorage
- **DevTools Panel**: Integrated into Chrome DevTools for developers
- **Domain Filtering**: Filter cookies by domain with smart matching

## Installation

1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the `dist` folder

## Usage

### Popup
Click the extension icon to open the popup:
- Switch between **Cookies**, **Local**, **Session** tabs
- **Copy All**: Copy all items to clipboard (JSON format)
- **Paste**: Paste from clipboard or extension storage
- **Delete All**: Remove all items
- **Import/Export**: Load or save data as JSON files
- **Open Manager**: Open the full management page

### Manager Page
Full-featured interface with:
- Tab navigation (Cookies / LocalStorage / SessionStorage)
- Search and filter capabilities
- Batch selection and operations
- Edit individual items
- Click on name/value to copy

### DevTools Panel
Open Chrome DevTools (F12) and find "Coffer" panel:
- View all cookies for the current page
- Quick edit and delete operations

## Data Format

### Cookies (JSON)
```json
[
  {
    "name": "session_id",
    "value": "abc123",
    "domain": ".example.com",
    "path": "/",
    "secure": true,
    "httpOnly": false,
    "sameSite": "lax",
    "expirationDate": 1234567890,
    "storeId": "0"
  }
]
```

### Storage Items (JSON)
```json
[
  {
    "key": "user_token",
    "value": "xyz789"
  }
]
```

## Security Notice

⚠️ **IMPORTANT SECURITY WARNINGS**

### Sensitive Data
Cookies and storage data often contain sensitive information:
- Session tokens and authentication credentials
- Personal user data and preferences
- API keys and access tokens
- Shopping cart contents and user state

⚠️ **Do not share exported data with others - this may lead to account compromise and data breaches**

### Best Practices
1. **Never share exported JSON files** - They contain plain-text sensitive data
2. **Be cautious when pasting cookies** - Only paste to trusted domains
3. **Clear clipboard after use** - Don't leave sensitive data in your clipboard
4. **Avoid using on public computers** - Data may be cached or logged
5. **Review before importing** - Always check the content of imported files

### Cross-Origin Risks
When copying cookies from one domain to another:
- Session hijacking is possible if cookies are pasted maliciously
- Always verify the target domain before pasting
- Be aware that pasting cookies may bypass security measures

### Incognito Mode
- Cookies copied from incognito mode may contain sensitive session data
- Pasting to regular mode will persist data that was meant to be temporary
- Use caution when transferring data between incognito and regular windows

### Data Storage
- Clipboard data is stored in `chrome.storage.local`
- This data persists across browser sessions
- Consider clearing extension storage periodically

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Releasing

To create a new release:

```bash
npm run release 1.0.0
```

This will:
1. Update version in `package.json` and `manifest.json`
2. Commit changes
3. Create and push tag
4. GitHub Action will automatically build and create a release

Or manually:

1. Update version in `package.json` and `manifest.json`
2. Commit changes: `git commit -am "chore: bump version to x.x.x"`
3. Create tag: `git tag vx.x.x`
4. Push tag: `git push origin vx.x.x`
5. GitHub Action will automatically build and create a release

## Tech Stack

- Vue 3 + TypeScript
- Pinia (State Management)
- Tailwind CSS
- Vite
- Chrome Extension Manifest V3

## License

MIT License - Use at your own risk. The authors are not responsible for any security incidents or data breaches that may result from using this extension.

## Contributing

Contributions are welcome! Please ensure any pull requests:
1. Follow the existing code style
2. Include appropriate tests
3. Do not introduce security vulnerabilities
4. Update documentation as needed
