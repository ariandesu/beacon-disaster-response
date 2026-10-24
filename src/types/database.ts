export type BeaconStatus = 'open' | 'claimed' | 'resolved'
export type BeaconCategory = 'medical' | 'fire' | 'flood' | 'structural' | 'other'
export type BeaconSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface Beacon {
  $id: string
  $createdAt: string
  $updatedAt: string
  $permissions: string[]
  beaconId: string
  latitude: number
  longitude: number
  category: BeaconCategory
  severity: BeaconSeverity
  status: BeaconStatus
  createdAt: string
  claimedAt: string | null
  resolvedAt: string | null
  responderId: string | null
  locationLabel: string
}

export interface Claim {
  $id: string
  $createdAt: string
  $updatedAt: string
  $permissions: string[]
  beaconId: string
  responderId: string
  claimedAt: string
}

export type EventType = 'created' | 'claimed' | 'resolved' | 'updated' | 'assigned' | 'unassigned'

export interface Event {
  $id: string
  $createdAt: string
  $updatedAt: string
  $permissions: string[]
  eventId: string
  beaconId: string
  type: EventType
  message: string
  actorId: string
  createdAt: string
}

export interface Supply {
  $id: string
  $createdAt: string
  $updatedAt: string
  $permissions: string[]
  itemId: string
  name: string
  quantity: number
  updatedAt: string
}

export type SupplyType = 'boats' | 'medical_kits' | 'food_packs'

export const SUPPLY_TYPES: SupplyType[] = ['boats', 'medical_kits', 'food_packs']

export const BEACON_CATEGORIES: BeaconCategory[] = ['medical', 'fire', 'flood', 'structural', 'other']
export const BEACON_SEVERITIES: BeaconSeverity[] = ['critical', 'high', 'medium', 'low']
export const BEACON_STATUSES: BeaconStatus[] = ['open', 'claimed', 'resolved']

export const STATUS_COLORS: Record<BeaconStatus, string> = {
  open: 'beacon-red',
  claimed: 'beacon-amber',
  resolved: 'beacon-green',
}

export const STATUS_LABELS: Record<BeaconStatus, string> = {
  open: 'Open',
  claimed: 'Claimed',
  resolved: 'Resolved',
}

// Single source of truth for status styling across all pages.
// Literal class strings so Tailwind JIT can detect them at build time.
export const STATUS_BADGE_CLASSES: Record<BeaconStatus, string> = {
  open: 'bg-red-100 text-red-700 border-red-200',
  claimed: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
}

export const STATUS_SOLID_CLASSES: Record<BeaconStatus, string> = {
  open: 'bg-red-600 text-white border-transparent',
  claimed: 'bg-amber-500 text-white border-transparent',
  resolved: 'bg-green-600 text-white border-transparent',
}

export const STATUS_DOT_CLASSES: Record<BeaconStatus, string> = {
  open: 'bg-red-500',
  claimed: 'bg-amber-500',
  resolved: 'bg-green-500',
}

// Dark-command-center variants (used on /command)
export const STATUS_DARK_CLASSES: Record<
  BeaconStatus,
  { text: string; bg: string; border: string; dot: string }
> = {
  open: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400' },
  claimed: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  resolved: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', dot: 'bg-green-400' },
}

export const SEVERITY_BADGE_CLASSES: Record<BeaconSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

export const SEVERITY_DARK_CLASSES: Record<BeaconSeverity, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export const SEVERITY_LABELS: Record<BeaconSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const CATEGORY_LABELS: Record<BeaconCategory, string> = {
  medical: 'Medical',
  fire: 'Fire',
  flood: 'Flood',
  structural: 'Structural',
  other: 'Other',
}