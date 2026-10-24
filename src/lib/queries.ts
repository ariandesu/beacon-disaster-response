import { Query } from 'appwrite'
import type { Beacon, BeaconStatus, Event, Supply } from '../types/database'
import { APPWRITE_CONFIG } from '../lib/appwrite'

export function getBeaconsQueries(filters?: {
  status?: BeaconStatus
  category?: Beacon['category']
  severity?: Beacon['severity']
  limit?: number
  offset?: number
}) {
  const queries: string[] = [Query.orderDesc('$createdAt')]

  if (filters?.status) {
    queries.push(Query.equal('status', filters.status))
  }
  if (filters?.category) {
    queries.push(Query.equal('category', filters.category))
  }
  if (filters?.severity) {
    queries.push(Query.equal('severity', filters.severity))
  }
  if (typeof filters?.limit === 'number') {
    queries.push(Query.limit(filters.limit))
  }
  if (typeof filters?.offset === 'number') {
    queries.push(Query.offset(filters.offset))
  }

  return queries
}

export function getClaimsQueries(filters?: {
  beaconId?: string
  responderId?: string
  limit?: number
  offset?: number
}) {
  const queries: string[] = [Query.orderDesc('claimedAt')]

  if (filters?.beaconId) {
    queries.push(Query.equal('beaconId', filters.beaconId))
  }
  if (filters?.responderId) {
    queries.push(Query.equal('responderId', filters.responderId))
  }
  if (typeof filters?.limit === 'number') {
    queries.push(Query.limit(filters.limit))
  }
  if (typeof filters?.offset === 'number') {
    queries.push(Query.offset(filters.offset))
  }

  return queries
}

export function getEventsQueries(filters?: {
  beaconId?: string
  type?: Event['type']
  actorId?: string
  limit?: number
  offset?: number
}) {
  const queries: string[] = [Query.orderDesc('createdAt')]

  if (filters?.beaconId) {
    queries.push(Query.equal('beaconId', filters.beaconId))
  }
  if (filters?.type) {
    queries.push(Query.equal('type', filters.type))
  }
  if (filters?.actorId) {
    queries.push(Query.equal('actorId', filters.actorId))
  }
  if (typeof filters?.limit === 'number') {
    queries.push(Query.limit(filters.limit))
  }
  if (typeof filters?.offset === 'number') {
    queries.push(Query.offset(filters.offset))
  }

  return queries
}

export function getSuppliesQueries(filters?: {
  itemId?: Supply['itemId']
  limit?: number
  offset?: number
}) {
  const queries: string[] = [Query.orderAsc('name')]

  if (filters?.itemId) {
    queries.push(Query.equal('itemId', filters.itemId))
  }
  if (typeof filters?.limit === 'number') {
    queries.push(Query.limit(filters.limit))
  }
  if (typeof filters?.offset === 'number') {
    queries.push(Query.offset(filters.offset))
  }

  return queries
}

export const TABLE_IDS = {
  beacons: APPWRITE_CONFIG.tables.beacons,
  claims: APPWRITE_CONFIG.tables.claims,
  events: APPWRITE_CONFIG.tables.events,
  supplies: APPWRITE_CONFIG.tables.supplies,
} as const

export function generateBeaconId(): string {
  return `BCN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export function generateEventId(): string {
  return `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export function generateClaimId(): string {
  return `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export function generateSupplyId(): string {
  return `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export function nowISO(): string {
  return new Date().toISOString()
}