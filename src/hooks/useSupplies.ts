import { useState, useEffect, useCallback } from 'react'
import { databases, functions, APPWRITE_CONFIG } from '../lib/appwrite'
import { getSuppliesQueries } from '../lib/queries'
import type { Supply, SupplyType } from '../types/database'

export interface UseSuppliesResult {
  supplies: Supply[]
  isLoading: boolean
  error: string | null
  updateSupply: (_itemId: SupplyType, _quantity: number) => Promise<{ success: boolean; error?: string }>
  refetch: () => Promise<void>
}

/**
 * Reads the supply inventory. Writes are deliberately NOT performed from the
 * browser: `updateSupply` invokes the admin-only `updateSupply` action on
 * the Beacon Operations Function, which re-checks the caller's `admin` label server-side.
 */
export function useSupplies(enabled = true): UseSuppliesResult {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const fetchSupplies = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      setError(null)
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
      const queries = getSuppliesQueries({ limit: 100 })
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.supplies,
        queries
      )
      setSupplies(response.documents as unknown as Supply[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch supplies'
      setError(message)
      setSupplies([])
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    fetchSupplies()
  }, [fetchSupplies])

  const updateSupply = useCallback(async (itemId: SupplyType, quantity: number) => {
    if (!enabled) {
      return { success: false, error: 'Sign in to manage supplies' }
    }
    if (!functions || !APPWRITE_CONFIG.isConfigured) {
      return { success: false, error: 'Appwrite not configured' }
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9999) {
      return { success: false, error: 'Quantity must be a whole number between 0 and 9999' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const execution = await functions.createExecution(
        APPWRITE_CONFIG.functions.updateSupply,
        JSON.stringify({ action: 'updateSupply', itemId, quantity }),
        false
      )
      const result = JSON.parse(execution.responseBody || '{}')
      if (!result.success) {
        const message = result.error || 'Failed to update supply'
        setError(message)
        return { success: false, error: message }
      }
      await fetchSupplies()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update supply'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [enabled, fetchSupplies])

  return { supplies, isLoading, error, updateSupply, refetch: fetchSupplies }
}
