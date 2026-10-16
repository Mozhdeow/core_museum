# CORE — Phase 03: Supabase Storage & 3D Asset Pipeline

## Phase name

Phase 03 — Supabase Storage & 3D Asset Pipeline. Date: 2026-10-13. Local implementation is complete; verification results are recorded below. Production acceptance remains a separate gate. Phases 01 and 02 remain the foundation.

## Goal

Improve the existing Storage adapter and admin editor with content-aware validation, predictable naming, previews and honest operation stages while retaining transactional metadata, optimistic concurrency, conservative cleanup and selected-model rendering. No new backend, dependency, bucket, migration or rendering architecture.

## Existing implementation confirmed

Reviewed the overview, both historical phase records, landing architecture record, all three migrations, service/domain contracts, admin editor, Storage/integrity services, museum loader and existing tests before changes. A concise assessment and implementation plan were presented before editing.

Existing: two public buckets, randomized UUID-associated paths, MIME/size checks, minimal GLB header checks, public URL generation, `upsert: false`, one existing-item RPC, draft-first creation, version checks, reference-aware post-commit cleanup, recoverable drafts and uncertain-write handling. Phase 02 already provides selected-URL GLTF caching, fitting, fallback and retry. Missing: image decoding/dimensions, meaningful GLB structural inspection, asset budgets, pending thumbnail/gallery previews and real operation-stage feedback. These gaps did not require replacing any existing system.

## What was implemented

- The existing Storage adapter delegates inspection/naming to one internal pure module. This module has no client or upload implementation. Successful immutable File inspection is reused through WeakMaps; failures are evicted. All callers await image inspection before draft creation or upload.
- Images require consistent MIME/extension, nonzero size, the existing hard limit, a matching signature and browser decoding with finite positive integer dimensions. Temporary ImageBitmaps are closed; fallback decoder URLs are revoked. Dimensions and advisory warnings are returned.
- GLBs require the existing extension/MIME/size rules plus valid version-2 container header/length, aligned bounded chunks, first/unique JSON, optional correctly ordered BIN, UTF-8 JSON, supported asset version, array shapes, buffer/BIN consistency and basic buffer-view/accessor/primitive/image references. Unknown chunk types are ignored. Required KTX2/Basis textures fail with an explicit unsupported message because the existing loader lacks its decoder. Other extensions produce a compatibility warning.
- Reports include approximate mesh triangles, declared buffer bytes, material/texture/animation counts, and bounded embedded PNG/GIF header dimensions with a clearly partial RGBA/mipmap estimate. Reports warn about large assets, external resources, extensions and missing mesh definitions; these advisory thresholds do not prevent uploads.
- Generated paths require a UUID owner, normalize that owner, use fresh random names and ignore original filenames. Upload checks reject traversal, encoded/query/control characters, wrong location/format and noncanonical generated filename shapes. Existing URLs and cleanup paths are not rewritten.
- Admin selection validates immediately, blocks saves during invalid/pending selection, permits clear/reselection and ignores stale validation responses. Valid images show local previews, filenames, sizes and dimensions. The existing thumbnail and gallery remain visible; model metadata and inspection summaries are shown without a second WebGL context.
- Save stages come from real service events: validating, preparing, uploading, committing, cleanup. No simulated byte percentages. Inputs are locked during saves. Upload-stage failures receive an explicit localized upload error and retain validated selections for safe retry. Successful saves receive a separate confirmation; cleanup warnings remain distinct. Existing failed-save, retained-draft and uncertain-outcome behavior is preserved in both languages.

## Files changed

This inventory lists Phase 03 edits only; earlier uncommitted phase work and unrelated landing edits were preserved.

| File | Purpose |
| --- | --- |
| `src/lib/services/supabase/assetValidation.ts` | Internal validation, asset reports and safe generated-path helpers |
| `src/lib/services/supabase/SupabaseStorageService.ts` | Integrate inspection/cache/path checks into the existing adapter |
| `src/lib/services/supabase/itemIntegrity.ts` | Await image preflight; report safe operation stages without changing transactions/cleanup |
| `src/lib/services/errors.ts` | Translate asset validation errors, including wrapped save causes |
| `src/pages/Admin/AssetPicker.tsx` | Validated selection, previews, summaries, clear/retry and URL cleanup |
| `src/pages/Admin/AdminPages.tsx` | Connect pickers/stages, prevent invalid or changing saves, show save confirmation |
| `src/i18n/locales/en/phase2.json` | English validation, asset and operation messages; namespace name is historical |
| `src/i18n/locales/fa/phase2.json` | Matching Persian messages |
| `package.json` | Add `test:storage` using the existing Node test tooling |
| `tests/asset-fixtures.ts` | Valid isolated PNG and GLB fixtures |
| `tests/storage-assets.test.ts` | Validation, budget, path and actual-loader compatibility regressions |
| `tests/backend-integrity.test.ts` | Async preflight, stage safety and gallery replacement coverage |
| `tests/backend-admin.spec.ts` | Preserve prior tests; add preview/validation/stage/upload/locale/race coverage |
| `docs/backend/PHASE_03_STORAGE_ASSETS.md` | This phase record and future asset rules |
| `docs/backend/PROJECT_BACKEND_OVERVIEW.md` | Append Phase 03 architecture and status without erasing history |

## Database changes

None. All three migrations, tables, constraints, function definitions, grants and policies are unchanged. No migration application, data backfill, seed change or destructive operation.

## Supabase changes

Local application code only: existing Storage inspection/naming, async preflight and stage reporting. The frontend client still uses only publishable credentials; no new secret or configuration requirement.

Deployed: none. No real uploads/deletes, policy or bucket edits, user changes or migrations. No authorized authenticated management/database session is available in this task. Earlier read-only anonymous zero-record HEAD checks returned 401. They do not prove correct key, schema, RLS or Auth behavior. This phase makes no production verification claim and does not repeat unauthenticated probes as security evidence.

Outstanding deployment verification: deployed RPC signature/body and SECURITY INVOKER grants; stable-ID/path/slug constraints; RLS on all six tables; visitor published/active access and admin draft/content access; protected profile roles; Auth/session/configuration behavior; actual bucket visibility, MIME/size limits and object policies; authorized public URL resolution and cache behavior; anonymous/visitor rejection of asset/content writes. Verify through authorized read-only inspection and separately authorized isolated security integration tests before release, never production write experiments by default.

## Architecture decisions

### Bucket inventory and Storage organization

| Bucket | Visibility in repository migration | Hard limit | Allowed types |
| --- | --- | --- | --- |
| `museum-images` | Public | 10 MiB = 10,485,760 bytes per file | JPEG, PNG, WebP, AVIF, GIF |
| `museum-models` | Public | 100 MiB = 104,857,600 bytes per file | GLB / application/octet-stream |

Preserved paths:

```text
museum-images/items/{exhibit-uuid}/thumbnail/{random-uuid}.{canonical-extension}
museum-images/items/{exhibit-uuid}/gallery/{random-uuid}.{canonical-extension}
museum-models/items/{exhibit-uuid}/model-{random-uuid}.glb
```

Singular `thumbnail` is required by the existing database constraint. Models remain directly under the item folder. JPEG names normalize to `.jpg`; `.jpeg` is accepted on input. The original model filename remains display metadata. Existing objects are neither moved nor forced into the new generated-name validation rule; it applies to new uploads. Continue using `storageService.imagePath/modelPath`, not manually composed paths. Path helpers perform cheap naming/metadata checks; full validation must be awaited separately or through `upload/saveExhibit`.

Future standalone textures/videos need a verified use case, explicit media metadata, lifecycle references, MIME/size/security policy design and a compatibility/deployment review before choosing folders or buckets. No such types or folders are added here. Prefer self-contained GLBs now; external resource paths need independent hosting/permission review.

### Existing versus new validation

| Asset | Previously | Phase 03 |
| --- | --- | --- |
| Images | MIME, nonempty, 10 MiB limit | Add extension consistency, signature, browser readability, dimensions and warnings |
| GLB | Extension/MIME/nonempty/100 MiB, first 12 header bytes | Add chunk bounds/alignment/order, UTF-8 JSON/version, basic references, buffer sizes, compatibility checks and lightweight reports |
| Paths | Fresh random name with caller-provided owner | Validate UUID/location, normalize owner, prohibit unsafe upload paths; keep existing layout |

Limits are inclusive. Image dimensions have no new hard performance ceiling; browser decoder failures still reject unreadable files. GLB inspection is deliberately not the full Khronos validator: it does not decode compressed geometry, execute animations, validate every accessor byte range/scene graph, decode every embedded texture or guarantee renderability. Structural chunk behavior follows the [Khronos glTF specification](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc). Current installed Drei enables Draco/Meshopt by default; Draco uses an external decoder endpoint, and no KTX2 loader is configured. Verify actual extensions and decoder availability in the museum before publication.

### Recommended asset budgets

These are CORE authoring targets, not extra bucket limits or security enforcement.

| Measure | Desktop target | Mobile target / guidance |
| --- | --- | --- |
| GLB size | Prefer <= 20 MiB | Prefer <= 10 MiB, ideally 5 MiB for initial exhibit |
| Mesh triangles | Prefer <= 200,000 | Prefer <= 50,000; simplify/LOD in a future phase |
| Texture resolution | Usually <= 2048 px | Usually <= 1024 px; reuse atlases/maps |
| Texture count | Prefer <= 8 | Prefer <= 4; measure real GPU memory |
| Thumbnail | About 1024 px, ideally <= 250 KiB | Serve responsive variants in a future phase |
| Gallery images | About 2048 px, ideally <= 2 MiB | Prefer WebP/AVIF where supported; JPEG for compatibility, PNG for needed lossless/alpha |
| Materials | Prefer <= 16 | Prefer <= 8; reduce draw calls, transparency/transmission and shader cost |
| Animation clips | Prefer <= 4 | Prefer <= 2, modest bones/morph targets; profile animated bounds/playback separately |

UI warnings currently trigger for images over 4096 px or 2 MiB; GLBs over 20 MiB, 200,000 approximate mesh triangles, 16 materials, 8 textures or 4 clips; measured embedded PNG/GIF dimensions over 2048 px. Thumbnail/mobile targets remain documented recommendations. Counts do not include all instances, morph/skin work or custom shaders. Declared buffer bytes are not GPU memory. PNG/GIF texture estimates assume RGBA plus a full mip chain (width * height * 4 * 4/3), omit all unmeasured formats/external resources and may differ substantially from actual allocation. No conversion pipeline was added.

Future optimization should profile Draco/Meshopt with the existing loader, retain fallback/error paths, and review decoder hosting/CSP/offline behavior. KTX2 needs an explicitly configured supported loader and tested capability/transcoder setup before removing the current required-KTX2 rejection. Do not add these optimizers implicitly or dispose shared cached resources.

### Upload, replacement, deletion and cleanup lifecycle

1. Admin validates selection locally; pending image URLs are local previews only. All files are validated again by the existing `saveExhibit` preflight before any draft insertion or upload (successful File inspections are reused).
2. Existing items retain UUID and originally loaded version. New items insert one recoverable unpublished draft because `save_museum_item` cannot create.
3. Upload fresh paths with `upsert:false`; record attempted paths before SDK calls, including lost-response possibilities. Prior references/files stay intact.
4. Commit all metadata/spec/gallery/media/publication references using the existing RPC with optimistic version checking. No sequential-write fallback or claim that Storage shares this transaction.
5. Only after confirmed commit, consider superseded references from this operation. Require admin visibility, exact complete item/gallery reference counts and bucket/path matching. Shared assets stay; verification/deletion errors retain candidates and report a warning.
6. A definitive failed commit permits guarded cleanup of attempted new uploads. An uncertain insert/RPC outcome retains candidates and blocks blind retry. Known retained drafts retry by their ID/version. Ordinary failed uploads can retry with fresh names after guarded cleanup; retained candidates are not automatically swept.
7. Item deletion confirms the database deletion/version first. Gallery removal commits its authoritative reference change first. Only then guard cleanup. A cleanup failure cannot reverse a successful database operation or justify repeating it solely to delete files.

`SaveOptions.onStage` is optional, reports actual work and has no transaction authority. Observer exceptions are ignored so UI reporting cannot interrupt commit or cleanup. There is no reliable byte-level progress in the existing SDK workflow. `retainedAssets` remains available for investigation; shared retention is not automatically a cleanup failure or evidence of an orphan. No folder sweeps, cleanup queue or destructive automatic retry.

## Security considerations

Existing Auth/RLS/admin checks, SECURITY INVOKER RPC and publishable frontend keys remain authoritative. The browser's validation and route guards are bypassable usability protections. Storage policy limits enforce size and declared MIME, not a full content scan or GLB safety. An authenticated admin can use the SDK directly; path/type checks in this client do not tighten deployed policies. Current migration policies require admin writes and an `items` prefix, with broader admin update/delete scope.

For stronger enforcement, a separately justified trusted Supabase workflow should quarantine/inspect assets, validate formats with maintained tools, control external resource references, enforce approved variants and coordinate publication. An Edge Function can be considered only with that concrete requirement and appropriate resource limits; none was added here. Validated GLBs must not be described as inherently safe.

### Draft media exposure

The existing buckets remain public to preserve museum URLs. Database draft visibility does not make its assets private: anyone knowing a URL may fetch them; random UUID names are not authorization. Sensitive/unlicensed embargoed media should not enter these public buckets. A future private-draft design needs authenticated admin upload/read policies, short-lived signed previews and a reviewed publish step into the public delivery namespace (or a fully signed visitor architecture). Plan metadata/reference updates, rollback, cache exposure and cleanup carefully. Do not silently flip visibility, move live files or break current public URLs.

## Performance impact

No WebGL preview, new Canvas, full GLTF parsing, image conversion, optimizer or dependency is added to the admin. Image decoding is sequential per gallery batch and bitmaps are closed. Selection generations stop obsolete UI updates/additional decodes; object URLs are released on clear/replacement/unmount. Successful immutable File reports are weakly cached across selection, preflight and upload; no persistent file-content cache.

GLB reads only headers/chunk headers, JSON and small embedded PNG/GIF header slices, not the complete BIN or decoded geometry. JSON parsing and many metadata entries can still cost CPU/memory up to the existing 100 MiB upload limit. Browser image decoding can allocate large pixel buffers even for a small compressed file; recommendations are warnings, not resource guarantees. Test heavy authoring exports and physical phones separately. Existing selected-model loading, shared cache/fitting/retry/disposal rules remain unchanged. Bundle size, visited-model cache growth, GPU memory, animated bounds and real mobile budgets remain future profiling work.

## Test results

Final executed local results: **102 distinct tests passed**.

| Check | Result |
| --- | --- |
| `npm run test:backend` | 32 passed; includes all 29 Phase 01 cases plus async image preflight, safe stages and gallery replacement |
| `npm run test:museum` | 11 passed; original selection/request/cache/geometry cases retained |
| `npm run test:storage` | 14 passed; supported signatures, corrupt/empty/type/size/extension rejection, safe unique paths, chunk/JSON/BIN/reference checks, advisory complexity/texture estimates and actual loader/fitting compatibility |
| Existing admin browser suite | 14 passed on installed Edge (54.4 seconds); original five cases plus previews, invalid selection/recovery, gallery/model independence, actual decoding, stages/locking, Persian feedback, mocked SDK upload/no overwrite, stale validation/URL release and upload failure/retry |
| Existing museum browser suite | 11 passed on Edge (56.7 seconds); selected models, persistent Canvas, slow/missing/broken GLBs, scoped retries, bilingual/mobile content and journey entry |
| Landing regressions | All 20 passed against a production preview (2.7 minutes); unchanged protected source |
| `npm run typecheck` | Passed |
| `npm run build` | Passed, including final source; main bundle approximately 1.948 MB / 561 KB gzip |
| Phase source/test ESLint | Passed |
| `npm run lint` | Only the two pre-existing protected LandingIntro errors at lines 298 and 619; no new errors |
| `git diff --check` | Passed |
| Protected hashes | All captured landing, experience and migration files match the Phase 03 starting state |

Native tests use injected database/Storage services, injected image dimensions where a browser decoder is unavailable, and the actual installed Three/GLTFLoader for model fitting. Browser tests exercise actual image decoding and the actual SDK upload adapter against controlled responses. All Supabase traffic in admin/museum tests is blocked/intercepted; no real Supabase writes, deletes or deployed policy tests. Failure-model browser diagnostics are expected and caught. An initial admin run correctly rejected an invalid PNG fixture with a bad IDAT checksum; the fixture was corrected rather than relaxing the validator, and the complete final suite passed. New lint/typecheck issues found during implementation were corrected; they are not classified as pre-existing failures.

Commands:

```powershell
npm run test:backend
npm run test:museum
npm run test:storage
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx playwright test --config tests/backend-admin.playwright.config.ts
npx playwright test --config tests/museum.playwright.config.ts
npm run typecheck
npm run lint
npm run build
git diff --check
```

Landing verification used an owned `npm run preview -- --host 127.0.0.1 --port 5195 --strictPort` after a successful build, with `PLAYWRIGHT_PORT=5195` and `npx playwright test --config tests/landing.playwright.config.ts`. The complete landing pass preceded final admin-only upload-error wording/feedback and a required-extension warning refinement; the final production build and relevant admin/Storage checks passed afterward. No protected landing or rendering changes were made. Existing large-chunk/ineffective dynamic-import and Three Clock/shadow warnings remain. Browser checks use emulated viewports, not physical phones/Safari.

Local Phase 03 acceptance: complete with the explicitly documented pre-existing lint baseline. Production acceptance: incomplete pending authorized deployed-state/security verification. Phase 04 was not started.

## Future dependencies

Future rooms should consume Phase 02's selected UUID/section taxonomy and the existing Storage public URLs. Admin CMS enhancements should reuse this picker/adapter, await inspection, pass the original version and call one integrity save. Optimization work should produce compatible self-contained variants and measured budgets. Shared media registries, durable cleanup/quarantine, private drafts, resumable uploads, video and texture variants require explicit schema/policy/security design rather than ad hoc browser cleanup.

## Known limitations

- Production schema/Auth/RLS/Storage verification is incomplete. Earlier 401 probes are not security proof.
- PostgreSQL/Storage and reference-check/delete requests are not atomic together. External reattachment after a reference check remains a race; durable cleanup needs trusted coordination.
- No full glTF semantic/security validator, texture transcoding, per-format embedded texture decoding, animation preview/playback, instance-expanded triangle counting or exact GPU estimate.
- Model summaries intentionally replace extra WebGL previews; preview actual rendering through the existing museum after an authorized save and catalog reload.
- Required KTX2 uploads are rejected until a decoder exists. Optional/unknown extensions and external-resource URLs require manual compatibility review. Browser codec availability may affect AVIF/GIF/WebP decoding; existing assets are not revalidated or moved.
- No byte upload percentage, resumable upload, persistent cleanup queue or production asset tests. A lost write response requires reconciliation; retained files may need later investigation.
- The editor still uses the existing category/section choices; dynamic admin taxonomy redesign is outside this asset phase.
- Large compressed images/JSON/models can still consume browser memory. Actual mobile/Safari hardware, complex/skinned models and external decoder availability need separate profiling.
- The two pre-existing protected LandingIntro lint errors and existing build/Three compatibility warnings remain outside scope.

## How future phases should use this information

Read the overview and all completed phase records first. Keep the two buckets/current path conventions and use `storageService` only. Await its validators; use inspection warnings as authoring feedback, not unpublished arbitrary hard limits. Preserve stable UUIDs/original versions, draft recovery, atomic metadata RPC and post-commit guarded cleanup. Preserve Phase 02 selected-model cache/resources and never create a competing preview cache that disposes them. Reconcile uncertain outcomes before retry. Treat live verification as a separate release gate and require verified deployed state before resource changes. Update this record/overview as contracts evolve. Phase 04 has not started.
