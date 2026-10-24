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

export function useBeacons(statusFilter?: BeaconStatus, enabled = true): UseBeaconsResult {
  const [beacons, setBeacons] = useState<Beacon[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchBeacons = useCallback(async () => {
    if (!enabled) {
      setBeacons([])
      setError(null)
      setIsLoading(false)
      return
    }

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
  }, [statusFilter, enabled])

  useEffect(() => {
    if (!enabled) {
      setBeacons([])
      setError(null)
      setIsLoading(false)
      return
    }

    fetchBeacons()

    // Subscribe to realtime updates
    if (appwriteClient && APPWRITE_CONFIG.isConfigured) {
      const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.tables.beacons}.documents`
      unsubscribeRef.current = appwriteClient.subscribe([channel], (response) => {
        // Appwrite document events look like:
        // databases.{dbId}.collections.{table}.documents.{create|update|delete}
        const isDocumentEvent = response.events?.some(
          (event) => event.startsWith(
            `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.tables.beacons}.documents.`
          )
        )
        if (isDocumentEvent) {
          // Coalesce bursts of realtime events into one refetch.
          if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
          refetchTimerRef.current = setTimeout(() => {
            refetchTimerRef.current = null
            fetchBeacons()
          }, 150)
        }
      })
    }

    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current)
        refetchTimerRef.current = null
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [fetchBeacons, enabled])

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
        // Events for this beacon's collection; each item in response.events matches the channel prefix + event type
        const isRelevantEvent = response.events?.some(
          (event) => event.startsWith(
            `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.tables.events}.documents.`
          )
        )
        if (isRelevantEvent) {
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