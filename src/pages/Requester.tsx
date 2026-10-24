import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BeaconForm from '../components/BeaconForm'
import { useGeolocation } from '../hooks/useGeolocation'
import { useBeaconCreation } from '../hooks/useBeaconCreation'
import type { Beacon } from '../types/database'

const DEMO_LAT = 37.7749
const DEMO_LNG = -122.4194
const DEMO_LABEL = 'San Francisco, CA (Demo)'

export default function Requester() {
  const navigate = useNavigate()
  const { error: geoError, isLoading: geoLoading, isSupported, requestPosition, clearError } = useGeolocation()
  const { createBeacon, isLoading: creating, error: createError, lastCreated } = useBeaconCreation()

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleUseCurrentLocation = useCallback(async () => {
    clearError()
    try {
      const pos = await requestPosition()
      setCurrentLocation({
        lat: pos.latitude,
        lng: pos.longitude,
        label: `Lat: ${pos.latitude.toFixed(6)}, Lng: ${pos.longitude.toFixed(6)} (Accuracy: ${Math.round(pos.accuracy)}m)`,
      })
    } catch {
      // Error handled by geolocation hook
    }
  }, [requestPosition, clearError])

  const handleUseDemoLocation = useCallback(() => {
    clearError()
    setCurrentLocation({
      lat: DEMO_LAT,
      lng: DEMO_LNG,
      label: DEMO_LABEL,
    })
  }, [clearError])

  const handleSubmit = useCallback(async (data: {
    latitude: number
    longitude: number
    category: string
    severity: string
    locationLabel: string
  }) => {
    const beacon = await createBeacon({
      latitude: data.latitude,
      longitude: data.longitude,
      category: data.category as Beacon['category'],
      severity: data.severity as Beacon['severity'],
      locationLabel: data.locationLabel,
    })
    setShowSuccess(true)
    // Navigate to responder page with beacon ID after a short delay
    setTimeout(() => {
      navigate(`/respond?beacon=${beacon.beaconId}`)
    }, 3000)
  }, [createBeacon, navigate])

  const handleCreateAnother = useCallback(() => {
    setShowSuccess(false)
    setCurrentLocation(null)
  }, [])

  const handleLocationChange = useCallback((lat: number, lng: number, label: string) => {
    setCurrentLocation({ lat, lng, label })
  }, [])

  if (showSuccess && lastCreated) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Beacon Created</h1>
          <p className="text-gray-600 mb-6">Your emergency beacon has been activated and responders have been notified.</p>

          <div className="p-4 bg-gray-50 rounded-lg text-left space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">Incident ID:</span>
              <span className="font-mono font-bold text-lg text-beacon-red">{lastCreated.beaconId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-medium text-green-600">Open — Awaiting Responder</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Location:</span>
              <span className="font-medium">{lastCreated.locationLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category:</span>
              <span className="font-medium capitalize">{lastCreated.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Severity:</span>
              <span className="font-medium capitalize">{lastCreated.severity}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCreateAnother}
              className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-beacon-red focus:ring-offset-2 transition-colors"
            >
              Create Another Beacon
            </button>
            <button
              onClick={() => navigate(`/respond?beacon=${lastCreated.beaconId}`)}
              className="w-full py-3 bg-beacon-red text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-beacon-red focus:ring-offset-2 transition-colors"
            >
              View on Responder Map
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Beacon is a hackathon prototype and is not a substitute for official emergency services.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Emergency Help</h1>
        <p className="text-gray-600">
          Create a beacon to alert nearby volunteer responders. Your location and incident details
          will be shared with verified volunteers in the area.
        </p>
      </header>

      <BeaconForm
        initialData={currentLocation ? {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          locationLabel: currentLocation.label,
        } : undefined}
        onSubmit={handleSubmit}
        isLoading={creating || geoLoading}
        error={createError || geoError}
        onLocationChange={handleLocationChange}
        currentLocation={currentLocation}
        onUseCurrentLocation={handleUseCurrentLocation}
        onUseDemoLocation={handleUseDemoLocation}
      />

      {!isSupported && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg" role="alert">
          <p className="text-sm text-yellow-800">
            <strong>Geolocation not supported:</strong> Your browser doesn't support the Geolocation API.
            Please use the Demo Location button or enable location services in your browser settings.
          </p>
        </div>
      )}
    </div>
  )
}