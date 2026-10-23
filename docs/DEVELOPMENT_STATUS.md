# Photo to Dance — development checkpoint

Last updated: 2026-10-21. Branch: codex/photo-to-dance-ui.

Implemented in this branch:
- Responsive public UI (home, directory, Love Options, Stateside, pricing), image assets, My Videos.
- Private authenticated dance image upload and download, without public-disk fallback.
- Server-verified template availability and credits, deterministic idempotent task keys, transactional charge/refund logic.
- A PostgreSQL-only Replicate polling worker that claims tasks once, handles terminal states, stores private MP4 results and refunds confirmed upstream failures.
- Real task history and download links in My Videos (no fictitious completed task cards).
- Admin template editor and protected CRUD-style settings API for the two MVP templates.
- Scheduled GitHub Actions worker definition (will activate only after merge to default branch and configuring secrets).
- Isolated preview builds and CI security/build/type/SQLite regression checks.

Not verified or configured:
- Production PostgreSQL stress and concurrency tests, cloud storage credentials, model compatibility/reference-action licensing, real Replicate generations, Stripe checkout and price disclosure.
- Output quality across 20 authorized photos, actual cost and duration, retention/deletion, production serving and visual pixel matching.
- Brand new template slug creation (only the initial two fixed templates are configurable).

Launch and acceptance checklist: docs/DANCE_DEPLOYMENT.zh-CN.md.
Do not confuse green CI with production readiness; the paid generator stays gated until all required dependencies are configured and proven.
