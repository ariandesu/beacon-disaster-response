# Appwrite Functions

The deployed project uses two Function slots:

- `claim-beacon`: Beacon Operations action router (`claim`, `resolve`, `updateSupply`)
- `reset-demo`: admin-only deterministic reset and seed

The `resolve-beacon/` and `update-supply/` directories are standalone reference implementations retained for teams that later move to a plan with more Function slots. They are not deployed in the current two-slot project. Keep client calls pointed at `claim-beacon` unless the architecture is intentionally changed.

Each deployed Function should receive the collection IDs, endpoint, project ID, and a server-only scoped API key through Appwrite environment variables. Do not put those secrets in the Vite environment or source control.
