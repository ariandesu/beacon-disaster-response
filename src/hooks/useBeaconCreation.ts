import { useState, useCallback } from 'react'
import { databases, APPWRITE_CONFIG } from '../lib/appwrite'
import { generateBeaconId, nowISO } from '../lib/queries'
import type { Beacon, BeaconCategory, BeaconSeverity, BeaconStatus } from '../types/database'

export interface BeaconFormData {
  latitude: number
  longitude: number
  category: BeaconCategory
  severity: BeaconSeverity
  locationLabel: string
}

export interface UseBeaconCreationResult {
  createBeacon: (_data: BeaconFormData) => Promise<Beacon>
  isLoading: boolean
  error: string | null
  lastCreated: Beacon | null
}

export function useBeaconCreation(): UseBeaconCreationResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCreated, setLastCreated] = useState<Beacon | null>(null)

  const createBeacon = useCallback(async (data: BeaconFormData): Promise<Beacon> => {
    if (!databases || !APPWRITE_CONFIG.isConfigured) {
      throw new Error('Appwrite is not configured. Please check your environment variables.')
    }

    setIsLoading(true)
    setError(null)

    try {
      const beaconId = generateBeaconId()
      const timestamp = nowISO()

      const beaconDoc = {
        beaconId,
        latitude: data.latitude,
        longitude: data.longitude,
        category: data.category,
        severity: data.severity,
        status: 'open' as BeaconStatus,
        createdAt: timestamp,
        claimedAt: null,
        resolvedAt: null,
        responderId: null,
        locationLabel: data.locationLabel,
      }

      const created = await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.beacons,
        beaconId,
        beaconDoc
      )

      const beacon = created as unknown as Beacon
      setLastCreated(beacon)
      return beacon
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create beacon'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { createBeacon, isLoading, error, lastCreated }
}