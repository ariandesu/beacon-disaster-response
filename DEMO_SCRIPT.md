# Beacon demo script

Target length: 2–3 minutes.

## Before recording

- Open the production app at `https://beacon-disaster-response.vercel.app`.
- Confirm the Appwrite operator account has the `admin` label.
- If the data is not clean, run `SEED_EMAIL=... SEED_PASSWORD=... npm run seed:demo` locally.
- Use a desktop browser window wide enough to show the map and cards together.

## Scene 1 — Request help (30 seconds)

1. Start on **Request Help**.
2. Choose **Use demo location** if browser geolocation is unavailable.
3. Select a category and severity.
4. Submit the request.
5. Point out the success state: the beacon is now live on the responder map rather than redirecting the requester unexpectedly.

Suggested narration:

> “A requester can publish a location-based emergency beacon in seconds. Beacon writes only the initial public incident; operational changes are protected on the server.”

## Scene 2 — Responder workflow (60 seconds)

1. Open **Responder**.
2. Sign in or create a responder account.
3. Show the live incident markers and filter controls.
4. Open an open incident.
5. Click **Claim**.
6. Point out the claimed status and timeline entry.
7. Click **Resolve** and point out the resolved status and second timeline entry.

Suggested narration:

> “Claims are single-winner. The unique Appwrite index and server-side router prevent two responders from taking the same incident. Retrying claim or resolve is safe and repairs partial writes.”

## Scene 3 — Command center (45 seconds)

1. Open **Command** while signed out to show the access gate.
2. Sign in with the admin-labeled operator account.
3. Show the incident statistics, timeline, map, and inventory.
4. Change the boat quantity from 3 to 4 and save.
5. Refresh or point out the updated inventory.
6. Open **Reset demo data**, type `RESET DEMO DATA`, and run it only if you want to show the clean-state workflow.

Suggested narration:

> “The command center requires authentication, and inventory writes are admin-only. The reset action is a protected Appwrite Function that restores a deterministic three-incident dataset for repeatable demos.”

## Closing (15 seconds)

Show the three demo incidents on the map and say:

> “Beacon combines Appwrite Databases, realtime updates, Functions, and role-aware operations into one disaster-response workflow.”

Do not describe Beacon as a real emergency service. It is a hackathon prototype.
