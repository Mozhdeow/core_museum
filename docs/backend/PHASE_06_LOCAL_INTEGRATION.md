# CORE — Phase 06B: Local Supabase Integration, Security Verification & Readiness

Verification date: 2026-10-16. **Partial verification; Phase 06 is not ready to close.** Existing CORE was inspected read-only. All test accounts, role assignments, uploads and fixture migrations belonged to an independent disposable stack. No remote requests or deployments were made.

## Phase name and goal

Phase 06B — verify practical local Auth, database authorization, Storage and guarded Edge integration without rebuilding completed phases or putting existing CORE data at risk.

## Existing implementation and architecture

Targeted inspection covered the backend overview, Phase 03B/04/05 security and verification records, Supabase configuration, existing SQL tests/migrations, Auth/session client, content capabilities, catalog/CMS services, Storage URL handling and admin-users function. Existing service facades, Auth state, versioned atomic saving, roles, receipts and default-off guards are retained.

The frontend client already supports VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY), persistent sessions and automatic token refresh. Catalog queries explicitly select published content and active taxonomy; CMS uses existing UUID/version contracts. Image/model URLs use the configured client's Storage public URL builder. No application source defect requiring a change was confirmed in this bounded check.

## Actual local environment

| Component | Existing CORE | Disposable verification stack |
| --- | --- | --- |
| Project / API | core-museum / loopback port 54321 | core-phase06b-isolated / loopback port 55431 |
| PostgreSQL image | 17.6.1.171; server 17.6 | Same |
| Migration history | Five entries | Same five repository migrations applied to its new database only |
| Auth | v2.197.0, healthy | Same |
| PostgREST | v14.18, running | v16.3 selected by installed CLI |
| Storage | v1.77.5, healthy | v1.77.0 selected by installed CLI |
| Kong | 2.8.1, healthy | Same |
| Edge Runtime | v1.76.2, previously exited; left stopped | Same image; existing admin-users source served successfully |
| Other services | Studio, meta, realtime, mailpit and analytics healthy | Excluded where unnecessary |

The installed CLI is 2.118.0. Fixture PostgREST/Storage versions differ from existing CORE; these results do not constitute version-matched acceptance of that running stack. No Docker image was built in this task.

CORE Vector repeatedly restarts because its Docker container API source cannot connect to host.docker.internal:2375. The inspected container has no Docker socket mount or explicit API version override. Core Auth/API/Storage remain available; log ingestion is affected. No insecure Docker endpoint was enabled and no logging/CORE stack restart was attempted.

## What was implemented and files changed

- supabase/config.toml: corrected db.major_version from 15 to 17 to match the verified existing PostgreSQL runtime. Focused read-back confirms 17. This does not upgrade, restart or change a database. Existing admin-users configuration, including verify_jwt=true, was preserved.
- docs/backend/PHASE_06_LOCAL_INTEGRATION.md: this evidence and readiness record.
- docs/backend/PROJECT_BACKEND_OVERVIEW.md: appended current status/reference; historical phase records are preserved.

Temporary probes, fixture files and redacted result logs are under ignored .tmp/phase06b; they are not application tests or committed deployment configuration. The disposable stack was stopped with its own explicit workdir/project ID and --no-backup. Read-only Docker checks confirmed no matching containers or volumes remain. Existing CORE database stays healthy; its Edge/Vector states are unchanged.

## Database and Supabase changes

No existing CORE schema, migration history, policy, account, content, object, deployment, secret or security setting was modified. Existing database inspection used read-only transactions; HTTP checks were health/read requests and denied anonymous access attempts. No db reset, db push, remote migration or Edge deployment occurred.

Only the independently named, initially empty fixture database received copied migrations and controlled identities/content/assets. Fixture role assignment never touched CORE users. No role-assignment or deletion gate was enabled, including in the fixture. Existing pending migration edits were preserved byte-for-byte.

## Tests executed and results

Exactly three focused groups were used, with real local endpoints and no mocked responses:

| Group | Passed | Failed | Evidence |
| --- | ---: | ---: | --- |
| 1. Existing CORE, read-only | 8 | 0 | Server/history; RLS/grants and disabled editor gate; two public buckets; Auth health/settings; denied anonymous catalog, privileged RPC and settings access |
| 2. Disposable Auth/RLS/Storage | 12 | 0 | Registration escalation rejection; session/profile restoration; Visitor/editor/admin visibility; direct API/RPC restrictions; capabilities/published filter; real PNG/GLB uploads and byte reads; forbidden writes |
| 3. Disposable guarded Edge | 4 | 2 | JWT and role rejection; admin read operations; disabled writes; two exact-origin CORS contracts fail at gateway |
| **Acceptance total** | **24** | **2** | **26 checks** |

Group 1 denials included PostgREST SQLSTATE 42501, not merely HTTP 401. Installed-definition inspection also confirmed SECURITY INVOKER saving, required version checks, confirmed/non-banned role eligibility and 22 relevant installed policies. These observations supplement, rather than replace, real role requests.

Group 2 created only three controlled disposable identities. Registration with role=admin metadata produced a user profile. Real sessions saw published-only data for Visitor and draft/published data for staff. Direct client role escalation and privileged RPC attempts failed. The closed editor gate denied item insertion, save_museum_item and taxonomy insertion. Capabilities reflected roles with editor writes false. An explicit published catalog query excluded draft data even for staff. Admin uploaded representative existing PNG/GLB fixtures and public URL responses matched their bytes; Visitor/editor uploads were denied without extra objects. Full CMS/browser hydration and refresh were not exercised.

Group 3 used the unchanged function source with JWT verification on, three real fixture sessions, exact allowed origin and both admin write/verification flags false. Missing/invalid JWTs returned 401; Visitor/editor returned 403; admin capabilities/list returned 200 with every privileged capability false; an invite returned writesDisabled without an operation receipt or account creation.

The two failures are header-contract failures: anonymous POST correctly returned 401/unauthorized and disallowed-origin POST correctly returned 403/forbidden, but the wire Access-Control-Allow-Origin was * rather than the function's expected exact origin / absent header. Direct probing on the fixture-only Docker network confirmed the function itself returns the configured exact origin. Its generated Kong configuration includes CORS plugins without explicit origins; the gateway substitutes the wildcard. No authorization bypass was observed, and assertions were not relaxed. Resolving gateway/deployment CORS configuration is pending operator review.

Measured integration runner time was 79.454 seconds, including a bounded 75-second OPTIONS readiness probe that failed the exact-origin condition. Its 12 Auth/RLS/Storage assertions consumed 1.515 seconds. The Edge-only follow-up took 3.253 seconds and did not rerun Group 2. The initial readiness diagnostic remains a failure in the retained first-run log; it is not an additional acceptance case or silently reported as a pass. Existing read-only checks took seconds. Including one-time service provisioning and short diagnostics, command/test execution remained below the 15-minute budget (approximately several minutes); no stress/load/full regression loop was run.

Prior Phase 06 isolated PostgreSQL results remain **2 passed, 0 failed, 0 skipped** for admin-users-sql.test.ts and auth-roles-sql.test.ts. They were not rerun because no security migration changed here. They supersede the historical missing-binary blocker, but do not prove managed Supabase/Storage/Edge deployment acceptance. Typecheck, full ESLint/build, Playwright matrix, screenshots and additional application suites were deliberately not rerun for this config/documentation-only task. Final diff/whitespace and scope checks were performed separately.

## Security considerations and limitations

- editor_writes_verified remains false; CORE_ADMIN_WRITES_ENABLED and CORE_ADMIN_GUARDS_VERIFIED were never enabled. The existing CORE function is stopped, so its live deployment environment is not certified by fixture success.
- Current .env.local selects a remote Supabase URL. Its contents were preserved; no request was made to that host. Application source can select local configuration, but local frontend end-to-end acceptance is blocked until an operator deliberately selects a local development URL/key and reloads Vite. No frontend remote credentials were used for these tests.
- Public image/model buckets remain public by existing design: known draft object URLs are readable. These checks verify current behavior, not private draft media isolation.
- Editor positive writes with gates open, user promotion/deletion, last-admin race behavior through managed APIs, invite delivery/SMTP, redirect flows, uncertain outcomes and full CMS/catalog refresh remain outside this bounded acceptance. Existing SQL concurrency evidence is retained separately; no sensitive gate should be enabled from this report alone.
- Actual CORE PostgREST/Storage versions differ from the disposable stack. Neither container health nor mocked tests establish matching live authorization semantics.
- Secrets/tokens were kept out of reports and command output; temporary status credentials/session material were handled in memory. Fixture CLI output was redacted and fixture artifacts are ignored. No package dependency was added.

## Deployment prerequisites and exact next actions

1. For a deliberately local development session, select loopback API http://127.0.0.1:54321 and its matching local public/anon key in an uncommitted local environment, then restart Vite. Do not reuse a remote key or change production configuration. Verify real session/profile restoration, explicit catalog refresh, CMS taxonomy and media URLs there using approved controlled identities.
2. Review exact-origin CORS behavior in the local gateway and its deployment-equivalent configuration; propose the smallest configuration change without relaxing function origin/JWT checks. Validate allowed and disallowed wire responses after separately authorized runtime/configuration changes.
3. Start the existing local admin-users function only as an explicit local runtime action, with JWT verification and both admin flags false, an approved origin and local-only redirect. Confirm rejected requests and one approved read-only admin operation on matching versions, or first reproduce in a version-matched disposable stack.
4. Before production, independently review target migration history/state and ordered pending migration compatibility, backup/recovery, RLS/Storage/API grants, role/session failure semantics, operation receipts, concurrency and invitation/redirect/SMTP requirements. Deployment and any gate activation require separate authorization and completed target-specific evidence.
5. Optional: repair Vector against an approved Docker API transport if logging is required; do not expose unauthenticated port 2375 as a shortcut.

## Future dependencies and readiness

Use existing Auth, content, integrity and Storage contracts in later work. Retain UUID/version checks, draft recovery, cleanup ordering, protected registration, role guards and receipts. **Phase 06 remains open** for local frontend acceptance, gateway CORS and matching existing-runtime acceptance. No Phase 07 work was started.
