# Beacon schema and security

Project: `6adbc115002fbf8e703b`  
Database: `beacon-db` (`6adbc21b001e95337577`)  
Endpoint: `https://sgp.cloud.appwrite.io/v1`

The deployed project uses Appwrite's legacy Databases/collection API (often called DocumentsDB in the console). The IDs below are stable so the frontend can be configured with environment variables.

## Collections

### `beacons`

Collection permissions: `read("any")`, `create("any")`.

| Attribute | Type | Required | Notes |
|---|---|---:|---|
| `beaconId` | string, 64 | no | Public human-readable incident ID; normally equals `$id`. |
| `latitude` | double | yes | Incident latitude. |
| `longitude` | double | yes | Incident longitude. |
| `category` | enum | yes | `medical`, `fire`, `flood`, `structural`, `other`. |
| `severity` | enum | yes | `critical`, `high`, `medium`, `low`. |
| `status` | enum | yes | `open`, `claimed`, `resolved`. |
| `createdAt` | datetime | no | Incident creation time. |
| `claimedAt` | datetime | no | Claim time, nullable. |
| `resolvedAt` | datetime | no | Resolution time, nullable. |
| `responderId` | string, 64 | no | Assigned Appwrite user ID, nullable. |
| `locationLabel` | string, 256 | yes | Human-readable location description. |

Indexes: `idx_status(status)`, `idx_category(category)`, `idx_severity(severity)`, `idx_created_at(createdAt DESC)`.

Public create is intentional for the requester flow. There is no browser update/delete permission; claim and resolve updates happen in the operations Function.

### `claims`

Collection permission: `read("users")`.

| Attribute | Type | Required | Notes |
|---|---|---:|---|
| `beaconId` | string, 64 | yes | Claimed beacon. |
| `responderId` | string, 64 | yes | Authenticated responder ID. |
| `claimedAt` | datetime | yes | Claim time. |

Indexes: `unique_beacon_id(beaconId)`, `idx_responder_id(responderId)`, `idx_claimed_at(claimedAt DESC)`.

The unique index is the concurrency guard: two responders may race, but only one claim document can exist for a beacon.

### `events`

Collection permission: `read("users")`.

| Attribute | Type | Required | Notes |
|---|---|---:|---|
| `eventId` | string, 64 | no | Timeline event ID. |
| `beaconId` | string, 64 | yes | Related beacon. |
| `type` | enum | yes | `created`, `claimed`, `resolved`, `updated`, `assigned`, `unassigned`. |
| `message` | string, 512 | yes | Timeline message. |
| `actorId` | string, 64 | no | User or `system`. |
| `createdAt` | datetime | no | Event time. |

Indexes: `idx_beacon_id(beaconId)`, `idx_type(type)`, `idx_actor_id(actorId)`, `idx_created_at(createdAt DESC)`.

### `supplies`

Collection permission: `read("users")`.

| Attribute | Type | Required | Notes |
|---|---|---:|---|
| `itemId` | string, 64 | yes | `boats`, `medical_kits`, or `food_packs`. |
| `name` | string, 128 | yes | Display name. |
| `quantity` | integer | yes | Non-negative inventory count. |
| `updatedAt` | datetime | no | Last update time. |

Indexes: `unique_item_id(itemId)`, `idx_name(name ASC)`.

## Function security

### Beacon Operations (`claim-beacon`)

The browser may execute the Function endpoint, but the handler requires the trusted Appwrite `x-appwrite-user-id` header. It supports:

- `{"action":"claim","beaconId":"..."}` — authenticated responder; idempotently repairs partial claims.
- `{"action":"resolve","beaconId":"..."}` — assigned responder or `admin` user label.
- `{"action":"updateSupply","itemId":"boats","quantity":3}` — `admin` user label only.

The Function uses a scoped server key with `documents.read`, `documents.write`, and `users.read` access. The key is configured in Appwrite, never in the frontend.

### Reset Demo Data (`reset-demo`)

Requires an authenticated user with the `admin` label. It deletes all claims, events, beacons, and supplies and seeds the deterministic dataset described in [README.md](README.md).

## Admin role

The primary role is the Appwrite user label `admin`. `ADMIN_EMAILS` may be configured as a server-only, comma-separated fallback for bootstrap on each deployed Function, but it is not exposed to Vite or trusted by the browser. The project currently authorizes the operator through the `admin` label.
