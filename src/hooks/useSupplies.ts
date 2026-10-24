import { useState, useEffect, useCallback } from 'react'
import { databases, APPWRITE_CONFIG } from '../lib/appwrite'
import { getSuppliesQueries, generateSupplyId, nowISO } from '../lib/queries'
import type { Supply, SupplyType } from '../types/database'

export interface UseSuppliesResult {
  supplies: Supply[]
  isLoading: boolean
  error: string | null
  updateSupply: (_itemId: SupplyType, _quantity: number) => Promise<{ success: boolean; error?: string }>
  refetch: () => Promise<void>
}

export function useSupplies(): UseSuppliesResult {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSupplies = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchSupplies()
  }, [fetchSupplies])

  const updateSupply = useCallback(async (itemId: SupplyType, quantity: number) => {
    if (!databases || !APPWRITE_CONFIG.isConfigured) {
      return { success: false, error: 'Appwrite not configured' }
    }

    try {
      const existing = supplies.find(s => s.itemId === itemId)
      const timestamp = nowISO()

      if (existing) {
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.tables.supplies,
          existing.$id,
          { quantity, updatedAt: timestamp }
        )
      } else {
        const supplyId = generateSupplyId()
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.tables.supplies,
          supplyId,
          { itemId, name: itemId.replace('_', ' '), quantity, updatedAt: timestamp }
        )
      }
      await fetchSupplies()
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update supply'
      return { success: false, error: message }
    }
  }, [supplies, fetchSupplies])

  return { supplies, isLoading, error, updateSupply, refetch: fetchSupplies }
}