import { useState, useEffect } from 'react'
import type { BeaconCategory, BeaconSeverity } from '../types/database'
import { BEACON_CATEGORIES, BEACON_SEVERITIES, CATEGORY_LABELS, SEVERITY_LABELS } from '../types/database'

interface BeaconFormProps {
  initialData?: Partial<{
    latitude: number
    longitude: number
    category: BeaconCategory
    severity: BeaconSeverity
    locationLabel: string
  }>
  onSubmit: (_data: {
    latitude: number
    longitude: number
    category: BeaconCategory
    severity: BeaconSeverity
    locationLabel: string
  }) => Promise<void>
  isLoading: boolean
  error: string | null
  onLocationChange: (_lat: number, _lng: number, _label: string) => void
  currentLocation: { lat: number; lng: number; label: string } | null
  onUseCurrentLocation: () => void
  onUseDemoLocation: () => void
}

export default function BeaconForm({
  initialData,
  onSubmit,
  isLoading,
  error,
  onLocationChange,
  currentLocation,
  onUseCurrentLocation,
  onUseDemoLocation,
}: BeaconFormProps) {
  const [category, setCategory] = useState<BeaconCategory>(initialData?.category ?? 'medical')
  const [severity, setSeverity] = useState<BeaconSeverity>(initialData?.severity ?? 'high')
  const [locationLabel, setLocationLabel] = useState(initialData?.locationLabel ?? '')

  useEffect(() => {
    if (initialData?.latitude && initialData?.longitude) {
      onLocationChange(initialData.latitude, initialData.longitude, initialData.locationLabel ?? '')
    }
  }, [initialData, onLocationChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentLocation) {
      return
    }

    await onSubmit({
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      category,
      severity,
      locationLabel: locationLabel || currentLocation.label,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Incident Details</h3>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={e => setCategory(e.target.value as BeaconCategory)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-beacon-red focus:border-transparent"
            required
            disabled={isLoading}
          >
            {BEACON_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
            Severity <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="severity"
            value={severity}
            onChange={e => setSeverity(e.target.value as BeaconSeverity)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-beacon-red focus:border-transparent"
            required
            disabled={isLoading}
          >
            {BEACON_SEVERITIES.map(sev => (
              <option key={sev} value={sev}>{SEVERITY_LABELS[sev]}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="locationLabel" className="block text-sm font-medium text-gray-700 mb-2">
            Location Description (optional)
          </label>
          <input
            type="text"
            id="locationLabel"
            value={locationLabel}
            onChange={e => setLocationLabel(e.target.value)}
            placeholder="e.g., Near Main St. bridge, 2nd floor apartment"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-beacon-red focus:border-transparent"
            disabled={isLoading}
            maxLength={200}
          />
          <p className="mt-1 text-xs text-gray-500">Helps responders find you faster</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Location</h3>

        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-beacon-red text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-beacon-red focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-busy={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use My Location
            </button>

            <button
              type="button"
              onClick={onUseDemoLocation}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-beacon-red focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Demo Location
            </button>
          </div>

          {currentLocation && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg" role="status" aria-live="polite">
              <p className="text-sm font-medium text-green-800">Location Set</p>
              <p className="text-sm text-green-700 mt-1">
                {currentLocation.label || `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          )}

          {!currentLocation && (
            <p className="text-sm text-gray-500">Select a location option above to continue</p>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isLoading || !currentLocation}
          className="w-full py-4 bg-beacon-red text-white font-bold text-lg rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-beacon-red focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating Beacon…
            </span>
          ) : (
            'Request Help'
          )}
        </button>
        <p className="text-center text-xs text-gray-500 mt-2">
          Beacon is a hackathon prototype and is not a substitute for official emergency services.
        </p>
      </div>
    </form>
  )
}