# Beacon — Disaster Response Coordination

A hackathon prototype for real-time disaster response coordination using Appwrite backend services.

## Overview

Beacon connects requesters who need help with responders who can provide assistance during a disaster.

**Core workflow:**
1. A requester reports a distress incident (location, severity, category).
2. The incident enters a shared beacon list visible to responders.
3. A responder claims the incident (single-winner mechanism).
4. The responder resolves/fulfills the incident.
5. Command/admins can reset demo data.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Appwrite Functions (Node.js)
- **Database:** Appwrite Databases (DocumentsDB-compatible API usage)
- **Deployment:** Vercel (frontend), Appwrite Cloud (backend)

## Requirements

- Node.js 18+
- npm

## Setup

### Frontend

```bash
npm install
cp .env.example .env.local
# Fill in Appwrite credentials in .env.local
npm run dev
```

### Backend (Appwrite Functions)

The project includes two Appwrite Functions:

- `claim-beacon` — handles incident claims.
- `resolve-beacon` — handles incident resolution with authorization.
- `reset-demo` — admin-only reset of demo data.

### Build / Deploy

```bash
npm run build
npm run lint
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_APPWRITE_ENDPOINT` | Appwrite endpoint (e.g. `https://cloud.appwrite.io/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Appwrite database ID |
| `VITE_APPWRITE_BEACONS_TABLE_ID` | Beacons collection ID |
| `VITE_APPWRITE_CLAIMS_TABLE_ID` | Claims collection ID |
| `VITE_APPWRITE_EVENTS_TABLE_ID` | Events collection ID |
| `VITE_APPWRITE_SUPPLIES_TABLE_ID` | Supplies collection ID |
| `VITE_APPWRITE_FUNCTION_CLAIM_ID` | Claim function ID |
| `VITE_APPWRITE_FUNCTION_RESET_ID` | Reset function ID |
| `VITE_APPWRITE_FUNCTION_RESOLVE_ID` | Resolve function ID |
| `APPWRITE_ADMIN_EMAILS` | Comma-separated admin emails for privileged ops |

## Security Notes

- Client-side role checks (email lists) are UI gates, not authorization.
- All privileged operations (claim, resolve, reset) are enforced server-side via Appwrite Functions.
- Appwrite Functions use API keys and validate caller identity via `x-appwrite-user-id` header.

## Disclaimer

This is a hackathon prototype and is not a substitute for official emergency services.
