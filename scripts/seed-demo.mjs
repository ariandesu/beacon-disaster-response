#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID
const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT
const RESET_FUNCTION_ID = process.env.VITE_APPWRITE_FUNCTION_RESET_ID || 'reset-demo'
const email = process.env.SEED_EMAIL
const password = process.env.SEED_PASSWORD

function loadLocalEnv(file = '.env.local') {
  return readFile(file, 'utf8')
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
        }
      }
    })
    .catch(() => undefined)
}

async function request(url, options, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options)
      if (response.ok || response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
  }
  throw lastError || new Error('Request failed')
}

await loadLocalEnv()

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || ENDPOINT
const projectId = process.env.VITE_APPWRITE_PROJECT_ID || PROJECT_ID

if (!endpoint || !projectId || !email || !password) {
  console.error('Usage: SEED_EMAIL=... SEED_PASSWORD=... npm run seed:demo')
  console.error('The script also reads VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID from .env.local.')
  process.exit(1)
}

const login = await request(`${endpoint}/account/sessions/email`, {
  method: 'POST',
  headers: {
    'X-Appwrite-Project': projectId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
})

if (!login.ok) {
  console.error(`Login failed (${login.status}): ${await login.text()}`)
  process.exit(1)
}

const cookies = login.headers.getSetCookie?.() || []
const cookieHeader = cookies.map((cookie) => cookie.split(';', 1)[0]).join('; ')
if (!cookieHeader) {
  console.error('Login succeeded but Appwrite did not return a session cookie.')
  process.exit(1)
}

const execution = await request(`${endpoint}/functions/${RESET_FUNCTION_ID}/executions`, {
  method: 'POST',
  headers: {
    'X-Appwrite-Project': projectId,
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  },
  body: JSON.stringify({ body: '{}', async: false }),
})

const result = await execution.json()
const responseBody = result.responseBody ? JSON.parse(result.responseBody) : result
if (result.status !== 'completed' || !responseBody.success) {
  console.error('Demo reset failed:', responseBody)
  process.exit(1)
}

console.log('Demo data seeded successfully.')
console.log(JSON.stringify(responseBody, null, 2))
