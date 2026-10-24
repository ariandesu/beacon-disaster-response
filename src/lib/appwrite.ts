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

/**
 * Function IDs are public identifiers, not secrets. Keep a safe default for
 * each one so a missing Vercel environment variable can never silently break
 * a deployed feature.
 */
function resolveFunctionId(value: string | undefined, fallback: string): string {
  if (value && !value.startsWith('your-')) return value
  return fallback
}

const FUNCTION_IDS = {
  claim: resolveFunctionId(import.meta.env.VITE_APPWRITE_FUNCTION_CLAIM_ID, 'claim-beacon'),
  reset: resolveFunctionId(import.meta.env.VITE_APPWRITE_FUNCTION_RESET_ID, 'reset-demo'),
  // The operations router keeps claim/resolve/supply in one Function because
  // the Appwrite plan allows two Functions. Both actions are dispatched by
  // the router via the request body's `action` field.
  resolve: resolveFunctionId(import.meta.env.VITE_APPWRITE_FUNCTION_RESOLVE_ID, 'claim-beacon'),
  updateSupply: resolveFunctionId(import.meta.env.VITE_APPWRITE_FUNCTION_UPDATE_SUPPLY_ID, 'claim-beacon'),
} as const

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
  functions: FUNCTION_IDS,
  isConfigured,
} as const

export { FUNCTION_IDS }

export { Permission, Role }
export type { Client as AppwriteClient }