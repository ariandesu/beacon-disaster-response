import { useState } from 'react'
import { useSupplies } from '../hooks/useSupplies'
import type { SupplyType } from '../types/database'
import { SUPPLY_TYPES } from '../types/database'

const SUPPLY_CONFIG: Record<SupplyType, { label: string; icon: React.ReactNode; color: string; bgClass: string }> = {
  boats: {
    label: 'Rescue Boats',
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7-7m0 0l-7 7m7-7v10" /></svg>,
    color: 'blue',
    bgClass: 'bg-blue-500/20',
  },
  medical_kits: {
    label: 'Medical Kits',
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    color: 'red',
    bgClass: 'bg-red-500/20',
  },
  food_packs: {
    label: 'Food Packs',
    icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2 z" /></svg>,
    color: 'green',
    bgClass: 'bg-green-500/20',
  },
}

interface SupplyCardProps {
  itemId: SupplyType
  quantity: number
  onUpdate: (_itemId: SupplyType, _quantity: number) => Promise<void>
  isLoading: boolean
  isAdmin: boolean
}

function SupplyCard({ itemId, quantity, onUpdate, isLoading, isAdmin }: SupplyCardProps) {
  const config = SUPPLY_CONFIG[itemId]
  const [localQuantity, setLocalQuantity] = useState(quantity)
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = async () => {
    if (localQuantity === quantity) {
      setIsEditing(false)
      return
    }
    await onUpdate(itemId, localQuantity)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalQuantity(quantity)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col h-full p-5 rounded-xl border border-gray-700 bg-gray-800/50 min-w-0">
      <div className="flex items-start gap-3 mb-4">
        <div className={`flex-shrink-0 p-3 rounded-xl ${config.bgClass}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{config.label}</h3>
          <p className="text-sm text-gray-400 truncate font-mono">{itemId}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3">
        {isEditing && isAdmin ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="9999"
              value={localQuantity}
              onChange={e => setLocalQuantity(parseInt(e.target.value) || 0)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
              style={{ minWidth: 0 }}
            />
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm whitespace-nowrap"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex-1 flex items-baseline gap-2 min-w-0">
              <div className="text-3xl font-bold text-white tabular-nums truncate">{quantity}</div>
              <span className="text-sm text-gray-400 whitespace-nowrap">units</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="flex-shrink-0 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm whitespace-nowrap"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface SupplyInventoryProps {
  isAdmin: boolean
}

export default function SupplyInventory({ isAdmin }: SupplyInventoryProps) {
  const { supplies, isLoading, error, updateSupply, refetch } = useSupplies()

  const handleUpdate = async (itemId: SupplyType, quantity: number) => {
    await updateSupply(itemId, quantity)
  }

  const supplyMap = new Map(supplies.map(s => [s.itemId, s]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Supply Inventory</h2>
        {isAdmin && (
          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex-shrink-0 px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
          Failed to load supplies: {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {SUPPLY_TYPES.map(itemId => {
          const supply = supplyMap.get(itemId)
          return (
            <SupplyCard
              key={itemId}
              itemId={itemId}
              quantity={supply?.quantity ?? 0}
              onUpdate={handleUpdate}
              isLoading={isLoading}
              isAdmin={isAdmin}
            />
          )
        })}
      </div>

      {!isAdmin && (
        <p className="text-sm text-gray-500 text-center mt-4">
          Supply editing restricted to administrators
        </p>
      )}
    </div>
  )
}