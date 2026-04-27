#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const version = process.argv[2]

if (!version) {
  console.log('Usage: npm run release <version>')
  console.log('Example: npm run release 1.0.0')
  process.exit(1)
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Error: Version must be in format x.x.x (e.g., 1.0.0)')
  process.exit(1)
}

const rootDir = path.join(__dirname, '..')
const packagePath = path.join(rootDir, 'package.json')
const manifestPath = path.join(rootDir, 'manifest.json')

console.log(`\n🚀 Releasing version ${version}...\n`)

// Update package.json
console.log('📝 Updating package.json...')
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
pkg.version = version
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')

// Update manifest.json
console.log('📝 Updating manifest.json...')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.version = version
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

// Commit changes
console.log('📦 Committing changes...')
try {
  execSync('git add package.json manifest.json', { cwd: rootDir, stdio: 'inherit' })
  execSync(`git commit -m "chore: release v${version}"`, { cwd: rootDir, stdio: 'inherit' })
} catch (e) {
  console.error('Error committing changes')
  process.exit(1)
}

// Create tag
console.log(`🏷️  Creating tag v${version}...`)
try {
  execSync(`git tag v${version}`, { cwd: rootDir, stdio: 'inherit' })
} catch (e) {
  console.error('Error creating tag (may already exist)')
  process.exit(1)
}

// Push commit and tag
console.log('🚀 Pushing to origin...')
try {
  execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' })
  execSync(`git push origin v${version}`, { cwd: rootDir, stdio: 'inherit' })
} catch (e) {
  console.error('Error pushing to origin')
  process.exit(1)
}

console.log(`\n✅ Release v${version} created successfully!`)
console.log(`📦 GitHub Action will build and create the release.\n`)