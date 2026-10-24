import { Client, Databases, Account, Functions, Permission, Role } from 'appwrite'

const requiredEnvVars = {
  VITE_APPWRITE_ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  VITE_APPWRITE_DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  VITE_APPWRITE_BEACONS_TABLE_ID: import.meta.env.VITE_APPWRITE_BEACONS_TABLE_ID,
  VITE_APPWRITE_CLAIMS_TABLE_ID: import.meta.env.VITE_APPWRITE_CLAIMS_TABLE_ID,
  VITE_APPWRITE_EVENTS_TABLE_ID: import.meta.env.VITE_APPWRITE_EVENTS_TABLE_ID,
  VITE_APPWRITE_SUPPLIES_TABLE_ID: import.meta.env.VITE_APPWRITE_SUPPLIES_TABLE_ID,
} as const

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value || value.startsWith('your-'))
  .map(([key]) => key)

if (missingVars.length > 0) {
  console.warn(
    `[Appwrite] Missing or placeholder environment variables: ${missingVars.join(', ')}.\n` +
    `Please configure them in .env.local (see .env.example). Appwrite features will be disabled.`
  )
}

const isConfigured = missingVars.length === 0

const client = new Client()

if (isConfigured) {
  client
    .setEndpoint(requiredEnvVars.VITE_APPWRITE_ENDPOINT)
    .setProject(requiredEnvVars.VITE_APPWRITE_PROJECT_ID)
}

export const databases = isConfigured ? new Databases(client) : null
export const account = isConfigured ? new Account(client) : null
export const functions = isConfigured ? new Functions(client) : null
export const appwriteClient = isConfigured ? client : null

export const APPWRITE_CONFIG = {
  endpoint: requiredEnvVars.VITE_APPWRITE_ENDPOINT,
  projectId: requiredEnvVars.VITE_APPWRITE_PROJECT_ID,
  databaseId: requiredEnvVars.VITE_APPWRITE_DATABASE_ID,
  tables: {
    beacons: requiredEnvVars.VITE_APPWRITE_BEACONS_TABLE_ID,
    claims: requiredEnvVars.VITE_APPWRITE_CLAIMS_TABLE_ID,
    events: requiredEnvVars.VITE_APPWRITE_EVENTS_TABLE_ID,
    supplies: requiredEnvVars.VITE_APPWRITE_SUPPLIES_TABLE_ID,
  },
  isConfigured,
} as const

export { Permission, Role }
export type { Client as AppwriteClient }