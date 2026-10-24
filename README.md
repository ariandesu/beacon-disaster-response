# Beacon — Disaster Response Coordination

Beacon is a real-time disaster-response coordination prototype built for the Appwrite Databases Hackathon. It connects people requesting help with authenticated responders and an operations command center.

> **Prototype disclaimer:** Beacon is not an emergency service. In a real emergency, contact local emergency services.

## What the demo shows

1. A requester submits a location, incident category, and severity.
2. The incident appears immediately on the public live map.
3. A signed-in responder claims an open incident; the unique claim index guarantees one winner.
4. The assigned responder resolves it through the server-side operations Function.
5. An administrator updates inventory and can restore a clean demo dataset.

## Architecture

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, React Leaflet.
- **Data:** Appwrite Databases / legacy DocumentsDB API with four collections: `beacons`, `claims`, `events`, and `supplies`.
- **Server logic:** Appwrite Cloud Functions running Node.js and the Appwrite server SDK.
- **Hosting:** Vercel with SPA rewrites for `/respond` and `/command`.

### Two-Function plan architecture

The deployed Appwrite project is intentionally limited to two Functions:

- **`claim-beacon` / “Beacon Operations”** — an action router for `claim`, `resolve`, and `updateSupply`.
- **`reset-demo` / “Reset Demo Data”** — admin-only deletion and deterministic demo seeding.

The router exists because the current Appwrite plan permits only two Functions. `functions/resolve-beacon/` and `functions/update-supply/` are standalone reference implementations for a future plan with more Function slots; they are not deployed by the current project.

## Local setup

Requirements: Node.js 18+ and npm.

```bash
npm install
cp .env.example .env.local
# Set the VITE_APPWRITE_* values for your Appwrite project.
npm run dev
```

The checked-in `.env.example` contains browser-safe values only. Never put an Appwrite API key or `ADMIN_EMAILS` in a `VITE_*` variable or commit `.env.local`. Configure `ADMIN_EMAILS` consistently as a server-side Function variable when using the optional email fallback.

## Scripts

```bash
npm run dev          # Start Vite development server
npm run lint         # Run ESLint
npm run build        # Typecheck and create production bundle
npm run preview      # Preview the production bundle
npm run seed:demo    # Seed through the deployed reset-demo Function
npm run setup:appwrite # Print/check the Appwrite setup checklist
```

`seed:demo` requires an authenticated admin session. It uses the same Appwrite account/session model as the web app and is intended for a local demo operator, not CI.

## Appwrite data model

The full collection attributes, permissions, indexes, and Function configuration are documented in [SCHEMA.md](SCHEMA.md).

Important permissions in the deployed project:

- `beacons`: guests may read and create; no client update/delete.
- `claims`, `events`, `supplies`: authenticated users may read; no client writes.
- Claim, resolve, supply-update, and reset writes happen in Functions using scoped server credentials.
- Admin authorization uses the Appwrite user label `admin`. `ADMIN_EMAILS` is an optional server-side bootstrap fallback only.

## Deployment

### Vercel

Set the variables in `.env.example` in the Vercel project, then deploy:

```bash
vercel --prod
```

The production project is configured with the SGP Appwrite endpoint and routes `/`, `/respond`, and `/command` through the Vite SPA entry point.

### Appwrite

The project configuration is in `appwrite.config.json`. Function source lives under `functions/`. Deploy a Function with:

```bash
appwrite functions create-deployment \
  --function-id claim-beacon \
  --code ./functions/claim-beacon \
  --entrypoint src/main.js \
  --commands "npm install" \
  --activate -f
```

Use the same command with `reset-demo` and its source directory. Function environment variables and API-key scopes are server-side settings and must be configured in the Appwrite Console/CLI.

## Demo reset

The command center reset action deletes claims, events, beacons, and supplies, then seeds:

- three open beacons: medical/critical, fire/high, and flood/medium;
- one creation event per beacon;
- rescue boats, medical kits, and food packs.

The reset is destructive and is intended only for the hackathon demo project.

## License

MIT — see [LICENSE](LICENSE).
