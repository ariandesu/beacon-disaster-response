import { useState, useCallback } from 'react'
import { functions, databases, APPWRITE_CONFIG } from '../lib/appwrite'
import { getClaimsQueries, generateEventId, nowISO } from '../lib/queries'
import type { Beacon, Claim } from '../types/database'

export interface UseClaimResult {
  claimBeacon: (_beaconId: string) => Promise<{ success: boolean; claim?: Claim; error?: string }>
  resolveBeacon: (_beaconId: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
  myClaims: Claim[]
  fetchMyClaims: () => Promise<void>
}

export function useClaim(userId: string | null): UseClaimResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myClaims, setMyClaims] = useState<Claim[]>([])

  const fetchMyClaims = useCallback(async () => {
    if (!userId || !databases || !APPWRITE_CONFIG.isConfigured) {
      setMyClaims([])
      return
    }

    try {
      const queries = getClaimsQueries({ responderId: userId, limit: 50 })
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.claims,
        queries
      )
      setMyClaims(response.documents as unknown as Claim[])
    } catch {
      setMyClaims([])
    }
  }, [userId])

  const claimBeacon = useCallback(async (beaconId: string) => {
    if (!userId) return { success: false, error: 'Not authenticated' }
    if (!functions || !APPWRITE_CONFIG.isConfigured) return { success: false, error: 'Appwrite not configured' }

    setIsLoading(true)
    setError(null)

    try {
      const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_CLAIM_ID
      if (!functionId || functionId.startsWith('your-')) {
        const message = 'Claim function is not configured'
        setError(message)
        return { success: false, error: message }
      }

      const execution = await functions.createExecution(
        functionId,
        JSON.stringify({ beaconId, responderId: userId }),
        false
      )
      const result = JSON.parse(execution.responseBody)
      if (!result.success) {
        setError(result.error || 'Claim failed')
        return { success: false, error: result.error || 'Claim failed' }
      }
      return { success: true, claim: result.claim }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claim failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const resolveBeacon = useCallback(async (beaconId: string) => {
    if (!userId) return { success: false, error: 'Not authenticated' }
    if (!databases || !APPWRITE_CONFIG.isConfigured) return { success: false, error: 'Appwrite not configured' }

    setIsLoading(true)
    setError(null)

    try {
      const db = databases
      if (!db) return { success: false, error: 'Appwrite not configured' }
      const beaconDoc = await db.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.beacons,
        beaconId
      ) as unknown as Beacon

      if (beaconDoc.responderId !== userId) {
        return { success: false, error: 'Only the assigned responder can resolve this beacon' }
      }
      if (beaconDoc.status === 'resolved') {
        return { success: false, error: 'Beacon is already resolved' }
      }

      const timestamp = nowISO()
      await db.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.beacons,
        beaconId,
        { status: 'resolved', resolvedAt: timestamp }
      )
      const eventId = generateEventId()
      await db.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.events,
        eventId,
        {
          eventId,
          beaconId,
          type: 'resolved',
          message: `Responder ${userId} resolved this beacon`,
          actorId: userId,
          createdAt: timestamp,
        }
      )
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resolve failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  return { claimBeacon, resolveBeacon, isLoading, error, myClaims, fetchMyClaims }
}