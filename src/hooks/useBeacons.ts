import { useState, useEffect, useCallback, useRef } from 'react'
import { databases, appwriteClient, APPWRITE_CONFIG } from '../lib/appwrite'
import { getBeaconsQueries, getEventsQueries } from '../lib/queries'
import type { Beacon, BeaconStatus, Event } from '../types/database'

export interface UseBeaconsResult {
  beacons: Beacon[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBeacons(statusFilter?: BeaconStatus): UseBeaconsResult {
  const [beacons, setBeacons] = useState<Beacon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const fetchBeacons = useCallback(async () => {
    if (!databases || !APPWRITE_CONFIG.isConfigured) {
      setError('Appwrite not configured')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queries = getBeaconsQueries({ status: statusFilter, limit: 100 })
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.beacons,
        queries
      )
      setBeacons(response.documents as unknown as Beacon[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch beacons'
      setError(message)
      setBeacons([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchBeacons()

    // Subscribe to realtime updates
    if (appwriteClient && APPWRITE_CONFIG.isConfigured) {
      const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.tables.beacons}.documents`
      unsubscribeRef.current = appwriteClient.subscribe([channel], (response) => {
        if (response.events?.some(event => event.startsWith('databases.*.collections.*.documents.'))) {
          fetchBeacons()
        }
      })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [fetchBeacons])

  return { beacons, isLoading, error, refetch: fetchBeacons }
}

export function useEvents(beaconId?: string) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!beaconId || !databases || !APPWRITE_CONFIG.isConfigured) {
      setEvents([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queries = getEventsQueries({ beaconId, limit: 50 })
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.events,
        queries
      )
      setEvents(response.documents as unknown as Event[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events'
      setError(message)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [beaconId])

  useEffect(() => {
    fetchEvents()

    if (beaconId && appwriteClient && APPWRITE_CONFIG.isConfigured) {
      const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.tables.events}.documents`
      unsubscribeRef.current = appwriteClient.subscribe([channel], (response) => {
        const event = response.events[0]
        if (event.startsWith('databases.*.collections.*.documents.')) {
          fetchEvents()
        }
      })
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [fetchEvents, beaconId])

  return { events, isLoading, error, refetch: fetchEvents }
}