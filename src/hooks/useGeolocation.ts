import { useState, useCallback } from 'react'

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number
}

export interface GeolocationState {
  position: GeoPosition | null
  error: string | null
  isLoading: boolean
  isSupported: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: false,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  })

  const requestPosition = useCallback((): Promise<GeoPosition> => {
    if (!state.isSupported) {
      return Promise.reject(new Error('Geolocation is not supported by this browser'))
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
          setState(prev => ({ ...prev, position, isLoading: false }))
          resolve(position)
        },
        (err) => {
          let message: string
          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = 'Location access was denied. Please enable location services or use the demo location.'
              break
            case err.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable. Please try the demo location.'
              break
            case err.TIMEOUT:
              message = 'Location request timed out. Please try again or use the demo location.'
              break
            default:
              message = 'An unknown error occurred while getting location.'
          }
          setState(prev => ({ ...prev, error: message, isLoading: false }))
          reject(new Error(message))
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }, [state.isSupported])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return { ...state, requestPosition, clearError }
}