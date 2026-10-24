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
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }
    if (!functions || !APPWRITE_CONFIG.isConfigured) {
      return { success: false, error: 'Appwrite not configured' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_CLAIM_ID
      if (!functionId || functionId.startsWith('your-')) {
        // Fallback: direct claim attempt (not secure, for demo only)
        return await claimBeaconDirect(beaconId, userId)
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

  const claimBeaconDirect = async (beaconId: string, responderId: string) => {
    if (!databases || !APPWRITE_CONFIG.isConfigured) {
      return { success: false, error: 'Appwrite not configured' }
    }

    try {
      // Check if beacon is still open
      const beaconDoc = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.beacons,
        beaconId
      )
      const beacon = beaconDoc as unknown as Beacon
      if (beacon.status !== 'open') {
        return { success: false, error: `Beacon is already ${beacon.status}` }
      }

      // Try to create claim (unique constraint on beaconId will prevent duplicates)
      const claimId = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      const timestamp = nowISO()

      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.claims,
        claimId,
        { beaconId, responderId, claimedAt: timestamp }
      )

      try {
        // Update beacon status
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.tables.beacons,
          beaconId,
          { status: 'claimed', claimedAt: timestamp, responderId }
        )
      } catch (updateErr) {
        // Rollback claim document if beacon update fails
        try {
          await databases.deleteDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.tables.claims, claimId)
        } catch {
          // Ignore cleanup error
        }
        throw updateErr
      }

      // Create event
      const eventId = generateEventId()
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.events,
        eventId,
        {
          eventId,
          beaconId,
          type: 'claimed',
          message: `Responder ${responderId} claimed this beacon`,
          actorId: responderId,
          createdAt: timestamp,
        }
      )

      return { success: true, claim: { $id: claimId, beaconId, responderId, claimedAt: timestamp } }
    } catch (err) {
      // Check if it's a unique constraint violation (Appwrite error code 409)
      const appwriteErr = err as { code?: number; message?: string; response?: string }
      if (appwriteErr.code === 409 || appwriteErr.message?.includes('unique') || appwriteErr.message?.includes('duplicate') || appwriteErr.response?.includes('409')) {
        return { success: false, error: 'This beacon has already been claimed by another responder' }
      }
      const message = err instanceof Error ? err.message : 'Claim failed'
      return { success: false, error: message }
    }
  }

  const resolveBeacon = useCallback(async (beaconId: string) => {
    if (!userId) {
      return { success: false, error: 'Not authenticated' }
    }
    if (!databases || !APPWRITE_CONFIG.isConfigured) {
      return { success: false, error: 'Appwrite not configured' }
    }

    setIsLoading(true)
    setError(null)

    try {
      // Verify ownership
      const beaconDoc = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.beacons,
        beaconId
      )
      const beacon = beaconDoc as unknown as Beacon

      if (beacon.responderId !== userId) {
        return { success: false, error: 'Only the assigned responder can resolve this beacon' }
      }
      if (beacon.status === 'resolved') {
        return { success: false, error: 'Beacon is already resolved' }
      }

      const timestamp = nowISO()

      // Update beacon
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.beacons,
        beaconId,
        { status: 'resolved', resolvedAt: timestamp }
      )

      // Create event
      const eventId = generateEventId()
      await databases.createDocument(
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