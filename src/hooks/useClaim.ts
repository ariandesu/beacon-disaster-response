import { useState, useCallback } from 'react'
import { functions, databases, APPWRITE_CONFIG } from '../lib/appwrite'
import { getClaimsQueries } from '../lib/queries'
import type { Claim } from '../types/database'

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
      const execution = await functions.createExecution(
        APPWRITE_CONFIG.functions.claim,
        JSON.stringify({ action: 'claim', beaconId }),
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
    if (!functions || !APPWRITE_CONFIG.isConfigured) return { success: false, error: 'Appwrite not configured' }

    setIsLoading(true)
    setError(null)

    try {
      const execution = await functions.createExecution(
        APPWRITE_CONFIG.functions.resolve,
        JSON.stringify({ action: 'resolve', beaconId }),
        false
      )
      const result = JSON.parse(execution.responseBody)
      if (!result.success) {
        setError(result.error || 'Resolve failed')
        return { success: false, error: result.error || 'Resolve failed' }
      }
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