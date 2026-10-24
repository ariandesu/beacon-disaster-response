#!/usr/bin/env node

import { readFileSync } from 'node:fs'

try {
  const content = readFileSync('.env.local', 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  }
} catch {
  // CI and fresh clones may not have a local env file; report missing values below.
}

const checks = [
  ['VITE_APPWRITE_ENDPOINT', process.env.VITE_APPWRITE_ENDPOINT],
  ['VITE_APPWRITE_PROJECT_ID', process.env.VITE_APPWRITE_PROJECT_ID],
  ['VITE_APPWRITE_DATABASE_ID', process.env.VITE_APPWRITE_DATABASE_ID],
  ['VITE_APPWRITE_BEACONS_TABLE_ID', process.env.VITE_APPWRITE_BEACONS_TABLE_ID],
  ['VITE_APPWRITE_CLAIMS_TABLE_ID', process.env.VITE_APPWRITE_CLAIMS_TABLE_ID],
  ['VITE_APPWRITE_EVENTS_TABLE_ID', process.env.VITE_APPWRITE_EVENTS_TABLE_ID],
  ['VITE_APPWRITE_SUPPLIES_TABLE_ID', process.env.VITE_APPWRITE_SUPPLIES_TABLE_ID],
]

console.log('Beacon Appwrite setup checklist')
console.log('')
console.log('1. Create/verify the four DocumentsDB collections: beacons, claims, events, supplies.')
console.log('2. Apply the permissions and indexes in SCHEMA.md.')
console.log('3. Deploy claim-beacon and reset-demo from functions/.')
console.log('4. Configure each Function with its server-only variables and scoped API key.')
console.log('5. Add the admin label to the operator account: admin.')
console.log('')

let failed = false
for (const [name, value] of checks) {
  const valid = Boolean(value && !value.startsWith('your-'))
  console.log(`${valid ? '✓' : '✗'} ${name}`)
  if (!valid) failed = true
}

if (failed) {
  console.error('\nSet the missing values in .env.local before running the frontend.')
  process.exitCode = 1
} else {
  console.log('\nFrontend Appwrite variables look complete.')
}
