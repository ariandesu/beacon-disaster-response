/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string
  readonly VITE_APPWRITE_PROJECT_ID: string
  readonly VITE_APPWRITE_DATABASE_ID: string
  readonly VITE_APPWRITE_BEACONS_TABLE_ID: string
  readonly VITE_APPWRITE_CLAIMS_TABLE_ID: string
  readonly VITE_APPWRITE_EVENTS_TABLE_ID: string
  readonly VITE_APPWRITE_SUPPLIES_TABLE_ID: string
  readonly VITE_APPWRITE_FUNCTION_CLAIM_ID: string
  readonly VITE_APPWRITE_FUNCTION_RESET_ID: string
  readonly VITE_MAP_DEFAULT_LAT: string
  readonly VITE_MAP_DEFAULT_LNG: string
  readonly VITE_MAP_DEFAULT_ZOOM: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}