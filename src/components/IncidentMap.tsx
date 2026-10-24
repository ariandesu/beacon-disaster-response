import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Beacon } from '../types/database'
import { STATUS_LABELS, CATEGORY_LABELS } from '../types/database'

// Explicit class maps — Tailwind JIT cannot generate `bg-${color}-100`
const STATUS_BADGE: Record<Beacon['status'], string> = {
  open: 'bg-red-100 text-red-700 border-red-200',
  claimed: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
}

const SEVERITY_BADGE: Record<Beacon['severity'], string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

// Fix Leaflet default marker icon (Vite cannot resolve the bundled asset URLs)
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Colored dot markers matching the status palette
const createStatusIcon = (status: Beacon['status']) => {
  const colors: Record<Beacon['status'], string> = {
    open: '#dc2626',
    claimed: '#f59e0b',
    resolved: '#16a34a',
  }
  return L.divIcon({
    className: 'beacon-marker',
    html: `<span style="
      display:block;
      width:16px;height:16px;
      border-radius:9999px;
      background:${colors[status]};
      border:3px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
    "></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}

interface MapMarkersProps {
  beacons: Beacon[]
  onBeaconClick: (_beacon: Beacon) => void
}

function MapMarkers({ beacons, onBeaconClick }: MapMarkersProps) {
  return (
    <>
      {beacons.map(beacon => (
        <Marker
          key={beacon.beaconId}
          position={[beacon.latitude, beacon.longitude]}
          icon={createStatusIcon(beacon.status)}
          eventHandlers={{ click: () => onBeaconClick(beacon) }}
        >
          <Popup>
            <div className="min-w-[190px] p-1">
              <div className="font-mono text-sm font-bold text-gray-900">{beacon.beaconId}</div>
              <div className="mt-1 text-sm text-gray-600">{beacon.locationLabel}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className={`rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_BADGE[beacon.status]}`}>
                  {STATUS_LABELS[beacon.status]}
                </span>
                <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                  {CATEGORY_LABELS[beacon.category]}
                </span>
                <span className={`rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${SEVERITY_BADGE[beacon.severity]}`}>
                  {beacon.severity}
                </span>
              </div>
              {beacon.responderId && (
                <div className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
                  Assigned: <span className="font-mono font-medium">{beacon.responderId.slice(0, 10)}…</span>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

function MapViewChanger({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 })
  }, [center, zoom, map])
  return null
}

interface IncidentMapProps {
  beacons: Beacon[]
  selectedBeaconId: string | null
  onBeaconClick: (_beacon: Beacon) => void
  center?: [number, number]
  zoom?: number
}

export default function IncidentMap({
  beacons,
  selectedBeaconId,
  onBeaconClick,
  center = [37.7749, -122.4194],
  zoom = 10,
}: IncidentMapProps) {
  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedBeaconId) {
      const beacon = beacons.find(b => b.beaconId === selectedBeaconId)
      if (beacon) return [beacon.latitude, beacon.longitude]
    }
    if (beacons.length > 0) {
      const avgLat = beacons.reduce((sum, b) => sum + b.latitude, 0) / beacons.length
      const avgLng = beacons.reduce((sum, b) => sum + b.longitude, 0) / beacons.length
      return [avgLat, avgLng]
    }
    return center
  }, [beacons, selectedBeaconId, center])

  const mapZoom = selectedBeaconId ? 14 : zoom

  return (
    <div className="h-full w-full overflow-hidden rounded-lg" style={{ zIndex: 0, isolation: 'isolate' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        className="h-full w-full"
        aria-label="Incident map showing beacon locations"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapMarkers beacons={beacons} onBeaconClick={onBeaconClick} />
        <MapViewChanger center={mapCenter} zoom={mapZoom} />
      </MapContainer>
    </div>
  )
}