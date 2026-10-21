# Dance generation — staged deployment and safety checks

## Current code
- Private uploads: POST /api/dance/upload (JPG/PNG/WebP, 8 MB), no disk/public fallback.
- Owner-authorized file responses: GET /api/dance/file?key=...
- Public catalog (read-only): GET /api/dance/templates
- Logged-in task create/list: POST/GET /api/dance/tasks. Task IDs are stable for a user/idempotency key; creation and credit consumption are atomic.
- Authenticated internal worker: POST /api/dance/worker. Scans queued tasks, starts Replicate predictions, polls running tasks, saves successful MP4s privately, refunds confirmed upstream failures.
- My Videos displays only real tasks with owner-gated MP4 files.
- Frontend retries a failed submission with the original photo upload key and idempotency key.

## Environment checklist (server-only)
Production use is **disabled** until all gates are configured. No model tests or paid video jobs were executed in this commit.

1. Use PostgreSQL (\`DATABASE_PROVIDER=postgresql\`). Do not enable paid workloads on D1; its current transaction adapter cannot roll back callback transactions. Perform concurrent credit stress tests before real payments.
2. Provide a **private** S3/R2 bucket: \`STORAGE_ENDPOINT\`, \`STORAGE_BUCKET\`, \`STORAGE_ACCESS_KEY\`, \`STORAGE_SECRET_KEY\`, optionally \`STORAGE_REGION\`. This path bypasses the general public uploader. Bucket anonymous public reads must be disabled. Ensure access-control, CORS and object retention/delete policies fit the privacy notice.
3. Supply \`REPLICATE_API_TOKEN\`, a strong \`DANCE_WORKER_SECRET\` and \`DANCE_GENERATION_ENABLED=true\`.
4. Configure **tested** Love Options provider inputs: \`DANCE_LOVE_OPTIONS_MODEL\`, \`DANCE_LOVE_OPTIONS_REFERENCE_URL\`, \`DANCE_LOVE_OPTIONS_CREDITS\` (positive integer), \`DANCE_LOVE_OPTIONS_ENABLED=true\`. The reference must be a licensed HTTPS asset accessible to the model. Repeat for \`DANCE_STATESIDE_*\` only after a separate successful test.
5. The configured model must accept a still photo + reference action. Default input fields are \`image\` and \`reference_video\`. Override via \`DANCE_MODEL_IMAGE_FIELD\`, \`DANCE_MODEL_REFERENCE_FIELD\` if that specific model uses other names. Set \`DANCE_LOVE_OPTIONS_PROMPT\` if required. These options MUST be proven with authorized samples: the source code cannot assert model compatibility.
6. Create GitHub Actions secrets \`DANCE_WORKER_URL\` (HTTPS base origin, not a path) and \`DANCE_WORKER_SECRET\`. The scheduled workflow only executes when present on the repository default branch. Before merge, trigger the worker manually against the deployment to verify networking and credentials.
7. Approve real credit price, charge/refund disclosures, storage retention periods, deployment and privacy/terms before enabling paid checkout.

## Recoverability
If the provider submission returns an uncertain network error, the task is deliberately left processing with \`requiresReconciliation\` and no upstream task ID. Do not automatically submit twice: an upstream generation may have started. Resolve against the provider logs and reconcile manually. Other in-progress predictions are polled; a failed download is retried on the next worker tick without asserting that model generation failed.

The worker requires PostgreSQL to use compare-and-set claims. No workers run in local SQLite. Price and length remain undisclosed/unavailable before successful model tests. The admin template-management UI remains a separate delivery item.

## Acceptance tests still required
- PostgreSQL concurrent charge/refund races, duplicate callbacks and crash recovery.
- Real 20-image Love Options test with measured duration, failure rate, cost and action similarity.
- Upload and download authorization (including cross-user IDs and deleted/expired objects).
- Production presigned link expiry, object ownership, MIME/codec and file size.
- Webhook verification if a webhook model is chosen; this worker currently polls instead.
- Visual mobile/desktop acceptance, payment sandbox tests and operational monitoring.
