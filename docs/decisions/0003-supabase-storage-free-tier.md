# ADR 0003: Store product media in Supabase Storage

- **Status:** Accepted by owner; UAT bucket and migrations configured, live pending UAT acceptance
- **Date:** 2026-11-19
- **Decision owner:** Project owner

## Context

The initial architecture listed Cloudflare R2 for media. The owner chose the free Cloudflare plan and received a subscription checkout warning while setting up Workers, and directed that all product media move to Supabase. The application already uses Supabase for Auth and PostgreSQL. The owner also requires separate UAT and live Supabase projects and no paid services without permission.

Supabase's current Free plan lists 1 GB file storage, 5 GB cached egress and 5 GB uncached egress. These are limited allowances, not a guarantee that every workload stays free. The selected design is sized for early catalogue images and must be checked against live account usage before launch.

## Decision

- Store product images in one private bucket named `product-media` in both UAT and live Supabase projects.
- Declare the same bucket name, privacy, accepted MIME types and 5 MiB limit in `supabase/config.toml`. Objects stay isolated by project.
- Store the bucket-relative path in `public.product_media.storage_path`; do not store provider URLs or Cloudflare object keys.
- Keep `storage.objects` metadata under Supabase management. All object upload, move, and deletion operations use the Storage API.
- RLS allows public callers to create short-lived signed URLs only for published media attached to published products. It denies public object listing and draft access. Admin mutations require trusted Supabase Auth `app_metadata.role=admin`.
- Cloudflare Workers remain the app host. Remove R2 bindings, fixtures, endpoints and deployment requirements. No R2 subscription, paid image transformation service, or other storage product is introduced.
- Start with product images only. 3D models, video, upload UI, image processing and admin media publishing remain deferred until a secure workflow and quota plan are reviewed.

## Consequences and rollout

- UAT and live require identical migrations and bucket configuration but hold separate files. Apply and verify UAT first; promote the same reviewed artifacts to live only after acceptance and release approval. Never run UAT seeds in live.
- The Supabase CLI's `seed buckets` command syncs the bucket declared in config. Database RLS policies and the `storage_path` schema are delivered through migrations. Cloudflare's deploy workflow does not apply either.
- At the time of this ADR, first-admin assignment and media upload were deferred. Stage 2 now implements membership-backed access and image upload; the UAT API upload and signed-image acceptance check remain unverified.
- Free storage and egress can be exhausted. Optimize files and monitor account usage. If the workload exceeds free limits, pause media growth and ask the owner before adopting a paid plan or another provider.
- The prior R2-oriented ADR and progress entries are historical evidence only. The current architecture authority is this ADR and the updated `PROJECT_SPEC.md`.

## Verification status

Repository configuration and policies are checked in. At acceptance of this ADR, no Supabase CLI or authenticated Supabase MCP tool was available in the active session. Since then, the owner confirmed the UAT project and the authenticated CLI created its private bucket, applied the three repository migrations and loaded the synthetic UAT fixture. Direct rollback-only SQL checks passed. The live project and Storage API upload/download remain unverified and unchanged; see `docs/PROGRESS.md` and `docs/ENVIRONMENTS.md` for exact next steps.
