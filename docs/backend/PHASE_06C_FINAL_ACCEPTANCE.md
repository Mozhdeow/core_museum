# CORE — Phase 06C: Local Integration Blockers & Acceptance

Date: 2026-10-16. **Targeted checks pass; Phase 06 remains open for authenticated acceptance on existing CORE and operator review of the local credential disclosure below.** This is local evidence, not production approval. No Phase 07 work was started.

## Goal and implemented changes

Resolve the Phase 06B gateway, frontend configuration, Edge startup and fixture-version blockers while preserving existing CORE data, application architecture and disabled privileged gates.

Added scripts/local-supabase.mjs with three explicit local commands:

```text
node scripts/local-supabase.mjs dev
node scripts/local-supabase.mjs edge
node scripts/local-supabase.mjs cors
```

- dev obtains local CLI status in memory, refuses a non-loopback API, and launches Vite at http://127.0.0.1:5191 with matching local public credentials as process overrides. Existing remote-targeting .env.local is unchanged. Both supported frontend key variables are overridden to avoid mixed local/remote configuration.
- edge starts only admin-users through the local CLI, preserving verify_jwt=true. Its ignored, non-secret environment file fixes both admin flags false and limits origins to localhost:5173 and 127.0.0.1:5191 with a local reset-password redirect. Existing CORE Edge v1.76.2 started successfully; no full stack restart was needed.
- cors removes only the generated default CORS plugin on Kong's functions-v1 service. Function-level origin validation now owns response headers. Request transformation, JWT verification and all other services/plugins remain unchanged. The helper validates the parsed semantic difference, preserves unrelated bytes, refuses customized/global CORS, is idempotent, and restores the original configuration if reload fails. The root-owned generated file requires a root container exec for this file write only; no database/application privileges are granted. Reload uses Kong's internal loopback admin API without a container restart.

The CORS helper uses already-installed js-yaml from the development dependency tree; no package was added. Missing parser or unexpected configuration fails closed. This is a **local generated-container configuration adjustment**, not a supported persistent CLI config.toml option: reapply after CLI recreates Kong. Do not automatically apply it to remote/hosted infrastructure. A separately reviewed self-hosted deployment can remove the equivalent scoped plugin while retaining strict handler CORS; a hosted gateway requires platform-specific review and wire verification.

## Runtime versions and database/Supabase changes

Existing CORE: PostgreSQL server 17.6/image 17.6.1.171, Auth v2.197.0, PostgREST v14.18, Storage v1.77.5, Kong 2.8.1 and Edge v1.76.2. Its existing five migrations and editor_writes_verified=false were preserved.

An independent core-phase06c-isolated stack used API port 55531. Its PostgREST/Storage containers were replaced only within that fixture with the exact cached CORE images; all listed essential service image versions matched. Fixture public JWKS plus legacy verification settings were matched to CORE's ES256 session support. This is image/key-verification compatibility evidence, not a claim that every runtime setting is identical.

Only disposable fixtures received test accounts, roles, exhibits and uploads. Existing CORE received no schema, migration, account, content, Storage-object or receipt changes. No gate was enabled, JWT disabled, remote request/deployment performed, or db reset/db push run. No Docker build or package installation occurred. The disposable stack was stopped without backups; no matching containers or volumes remained. Existing CORE Edge and the separate local frontend were left running. Vector logging was left unchanged.

## Tests and actual evidence

Three focused groups; **21 distinct checks passed in their final verified state, zero unresolved assertion failures, zero explicitly skipped test cases**:

| Group | Final passes | Evidence |
| --- | ---: | --- |
| Existing CORE / CORS tool | 7 | Scoped/idempotent transformation; customized/global CORS refusal; real allowed preflight/POST exact-origin headers; forbidden preflight/POST 403 with no allow-origin; missing/invalid JWT 401; served Vite local API/key; matching API denial and editor gate unchanged |
| Matching disposable services | 8 | Exact image versions; role visibility/capabilities; PNG/GLB upload/public bytes; Visitor/editor upload denial; Edge admin reads/exact CORS; Visitor/editor/origin rejection; disabled invite without account/receipt mutation; direct role escalation denial |
| Actual frontend against disposable services | 6 | Auth service sign-in/profile; persisted session after browser reload; published catalog/store explicit refresh with UUID taxonomy; local image/GLB URL reads; rendered admin CMS list/taxonomy; real editor session draft-only navigation with closed write gate |

Browser requests used real endpoints with non-loopback HTTP blocked, no mocked responses or injected Auth-store roles. CMS labels and fixture category/section IDs rendered correctly. Admin Edge list returned only the three fixture identities and privileged capabilities were false. The invite attempt was rejected before any write or external invitation.

Initial fixture replacement commands encountered local Docker invocation problems (stdin env-file unsupported, missing-container restoration, container PATH shadowing the host executable). These affected disposable provisioning only. The first acceptance attempt then had **two real fixture failures**: API role reads and admin uploads rejected ES256 sessions because the manually replaced containers lacked their public JWKS. CORE's inspected configuration already included those keys. Correcting fixture verification settings resolved the affected checks without changing assertions, policies or application code. Early upload denials alone were not accepted as RLS proof; they were rerun after signature verification was corrected.

The first browser attempt hit a Node allocation failure while host free memory was about 500 MB. Test-owned orphaned processes were stopped; one bounded browser retry completed all six checks. Earlier passing Edge cases were retained, not rerun as a full suite. Completed result files measure 4.865 seconds for Group 1 and 12.201 seconds for the corrected fixture/frontend runner; the persisted two-case native regression suite took approximately 0.092 seconds and repeats Group 1 cases rather than adding distinct cases. Including the failed attempt and service provisioning, test/diagnostic execution was several minutes, below 15 minutes; total task stayed below the 25-minute target.

Persisted regressions: node --test tests/local-supabase.test.mjs, **2 passed / 0 failed / 0 skipped**. Node syntax and diff/whitespace checks also pass. The already-passing two PostgreSQL suites were not rerun; neither security migration changed. No complete Playwright matrix, screenshot, stress test, application typecheck/build or full lint rerun was needed for this local tooling/documentation scope.

## Security, scope and limitations

- An early gateway diagnostic inadvertently printed local gateway key material in tool output. It is not repeated in these files. No remote credentials were read or disclosed. Treat local development keys as disclosed; an operator must review rotation/containment before broader use. No automatic key rotation, account change or destructive recovery was attempted.
- No existing CORE controlled-user credentials were available. Its live allowed/forbidden CORS, JWT rejection, anonymous API boundary and frontend process configuration were verified; authenticated Visitor/editor/admin sessions and CMS/media behavior were verified on the separate matching fixture. Existing-project authenticated reads remain an explicit acceptance gap, not a pass inferred from fixture results.
- .env.local, application source, migration candidates, package.json, configuration and historical phase records match the task-start snapshot. An unrelated .env.example change was detected during the session; none of this task's commands edited it, and it was preserved. It is excluded from claims of unchanged files.
- Both CORE_ADMIN_WRITES_ENABLED and CORE_ADMIN_GUARDS_VERIFIED are false in the running local Edge environment; the database editor gate remains false. Public draft media remains readable by known URL under the existing public-bucket design.
- No production readiness is inferred. Managed API concurrency, privileged account mutations, delivery/SMTP, redirect/recovery flows and target deployment state require their own authorized acceptance. Vector's existing Docker API logging failure is optional and unchanged.

## Files changed and next actions

This task adds scripts/local-supabase.mjs, tests/local-supabase.test.mjs and this document, and appends a status reference to PROJECT_BACKEND_OVERVIEW.md. It also applies the scoped in-container local gateway adjustment and starts local Edge/Vite processes; these runtime changes are not committed deployments.

1. Review the local key disclosure and arrange safe local-only key rotation/containment separately, without resetting existing data.
2. Supply an approved controlled local account/session through the browser at port 5191, then complete read-only session, catalog/CMS, role and Edge checks against existing CORE. Do not create/promote real users to obtain coverage.
3. Reapply/reverify the local scoped CORS adjustment after gateway recreation. Keep all sensitive flags false.
4. Before production, review target migration order/state, backup/recovery, role/RLS/Storage grants, receipts/concurrency, origins/JWT and SMTP/redirect behavior; obtain separate deployment and gate authorization.

Future phases should reuse existing Auth, Zustand and service contracts. **Phase 06 remains open for the specifically identified existing-project and key-handling gaps; Phase 07 is not started.**


## Phase 06D — Final local acceptance and credential review (2026-10-16)

**LOCAL PHASE 06 BLOCKED.** The user explicitly confirmed that no authorized existing local test session is available. Existing-project login/session restoration, published catalog/exhibit selection, authenticated CMS/taxonomy and media reads, and role-specific authenticated acceptance were therefore not attempted. Phase 06C's matching-fixture passes remain valid but do not close this gap. No account was inspected, impersonated, created or modified to obtain coverage.

### Credential classification and location

The Phase 06C diagnostic at 08:26:56 UTC printed the generated Functions request-transformer header expression. It contained four credential types:

| Type | Classification | Required treatment |
| --- | --- | --- |
| Local publishable API key | Public client identifier | Not independently a privileged secret |
| Local anon JWT | Public client credential, subject to anon permissions/RLS | Replace if coordinated legacy signing-key rotation requires it |
| Local secret API key | Privileged gateway credential | Treat as disclosed; operator replacement required |
| Local service_role JWT | Privileged bearer credential; can bypass RLS through permitted service APIs | Invalidate the old token, not only its modern key alias |

No database password, legacy signing secret or ES256 private signing key was present in that printed expression. Disabled admin/editor gates do not neutralize a leaked service-role bearer token.

Persistent exact matches were found in these local Codex session records (values intentionally omitted):

- C:/Users/Janusit/.codex/sessions/2026/10/04/rollout-2026-10-04T19-31-31-01a107a6-237c-77d2-b725-b544688b8593.jsonl, lines 4670–4671: completed-tool event and tool response.
- C:/Users/Janusit/.codex/sessions/2026/10/16/rollout-2026-10-16T11-49-46-01a143cb-b51e-7323-9eff-876ae698f0d8.jsonl, line 56: copied user-message content at 08:27:55 UTC.

The exposure reached conversation-visible output and persisted in two local session files; it cannot be classified as memory-only. Whether either conversation was shared, synchronized, exported or retained upstream cannot be established from this bounded local review. No public publication was established. These session files were not altered or deleted.

Exact-value comparisons, performed in memory without printing credentials, found **no matches** in tracked working-tree files, index, current HEAD, 58 untracked non-ignored files, backend reports/scripts, or the inspected ignored Phase 06/local-tool artifacts. This is not an exhaustive scan of every historical commit, unrelated log or external system. Existing generated Kong configuration still contains the current credentials as expected. Review artifacts under ignored .tmp/phase06d contain types/locations and results only.

### Minimum operator containment and rotation procedure

1. Restrict access to the affected conversations, session files and any copies; do not share/export them. Use supported application retention/redaction controls where available. Removing a local log alone neither revokes credentials nor proves removal of upstream copies.
2. Keep the API on a trusted host/network. Docker currently publishes port 54321 on 0.0.0.0 and [::], rather than loopback only. Firewall/NAT reachability was not tested. Have the operator restrict access or review loopback binding during authorized maintenance; no firewall/binding change was made here.
3. Before closing the credential condition, arrange a backed-up, coordinated **local-only** replacement of the modern secret key AND invalidation of the exposed legacy service JWT. Replacing only the modern alias is insufficient. Review the supported mechanism for this CLI/runtime first; no unverified rotation command or db reset/recreation is prescribed.
4. If legacy JWT invalidation requires rotating its shared HS256 verification/signing material, update all affected local consumers together: Kong aliases/consumers, Auth, PostgREST JWKS, Storage secret/JWKS and Edge service credentials/verification. Regenerate dependent anon/service credentials and update local public-client configuration as necessary. Do not rotate unexposed ES256 private keys without a separate reason. Account/session invalidation effects require operator review; preserve data and volumes, with all gates false. Any required service restart needs separate authorization.
5. Verify both old privileged credential forms are rejected and replacement credentials/approved controlled sessions work, without logging values or modifying existing content. Record operator evidence. No rotation, account change or container recreation was performed in Phase 06D.

### CORS reproduction and verification

Use the existing reviewed operator command from E:/core after an independently authorized local Kong recreation: node scripts/local-supabase.mjs cors. It supports the inspected Kong 2.8.1 DB-less layout, validates the scoped change, and fails closed on unexpected/custom configuration. It is not an automatic persistence hook or supported Supabase CLI override. Retain verify_jwt=true and the function's exact-origin allowlist; never dump generated YAML. For local function startup use the existing edge command with both flags false. No recreation or reload was needed in Phase 06D.

One wire-level group completed **5 passed / 0 failed in approximately 2.6 seconds**: allowed preflight 204/exact origin, allowed anonymous POST 401/exact origin, forbidden preflight and POST 403/no allow-origin, invalid JWT 401/no allow-origin. Local Vite returned HTTP 200; Edge was running; both admin flags and editor_writes_verified were false. Credential review and metadata inspection were read-only. No SQL, Phase 06B/06C or full browser suite was rerun. Authenticated acceptance is blocked, not silently counted as passed/skipped tests.

### Final decision and scope

**LOCAL PHASE 06 BLOCKED** on (1) operator containment/privileged-credential invalidation evidence, and (2) an explicitly authorized existing CORE test account/session followed by read-only authenticated acceptance, including exhibit selection. CORS reproduction and current wire behavior are verified. Production deployment readiness remains separate and unverified.

Phase 06D changes only this existing report and an appended backend-overview status; temporary review results are ignored. Previous uncommitted work is preserved. No source/business logic, migrations, operational data, credentials, gates or existing containers were modified. Stop at Phase 06; no Phase 07 work.


## Final Phase 06 handoff — 2026-10-16

**PHASE 06 LOCAL BLOCKED: OPERATOR ACTION REQUIRED**

This is the definitive Phase 06 decision, superseding the earlier account-unavailable and unrotated-Auth/API status above. Development handoff is to Phase 07 with the finite operator prerequisites below. No further Phase 06 development phase is proposed and Phase 07 execution has not begun. Production readiness is not asserted.

### Existing CORE authenticated acceptance completed

The operator explicitly authorized exactly one new disposable Visitor through normal local Supabase registration. API, Auth/Functions, database, S3 and Mailpit endpoint hosts were validated as loopback before creation; local SMTP pointed to CORE Mailpit. No additional account was created. Registration returned a session without requiring confirmation. Profile reads confirmed the database role is user. The generated identity is retained in .tmp/phase06-final/visitor-results.json (identity metadata only; no password/tokens). It was not promoted, edited or deleted.

Real existing-CORE checks passed for normal frontend login/profile, persisted session after reload, logout/protected-route denial, draft queries returning no rows, profile queries returning only the Visitor, and privileged RPC rejection, Visitor CMS denial, capability role=user/editorWritesVerified=false, and guarded Edge rejection with exact-origin headers. Existing application services/store loaded the real catalog: **zero published exhibits, six active categories and eight active sections**. No exhibits or assets were fabricated or changed.

Four explicit skips remain: (1) real exhibit selection and bilingual exhibit information, (2) available image URL, (3) available GLB URL, because no published exhibits/assets are available; (4) positive Admin/editor CMS acceptance, because no separate administrative session was authorized. Empty-catalog loading passed; these skipped content checks are not reported as passes. With no exhibit rows present, the draft query cannot prove visibility against a populated draft; existing SQL security evidence is retained separately. Positive administrative acceptance remains an operator/production-administration prerequisite rather than permission to promote the Visitor.

### Approved Auth/API security maintenance completed

After reviewing the impact, the operator approved **supported Auth/API maintenance only**, including encrypted backups and necessary local service recreation. Database passwords and S3 credentials were outside that approval.

Before changes, a Windows DPAPI CurrentUser-encrypted backup was created at .tmp/phase06-final/pre-auth-maintenance.dpapi. It contains the full database custom dump, roles/globals, Storage blob tar, runtime/container configuration and credentials, Kong configuration and local Supabase configuration/version metadata. Decrypt/hash round-trip passed. It is bound to the current Windows user's DPAPI profile; protect the profile/master-key recovery path. A full isolated restoration drill was not performed.

The exact CLI v2.118.0 source confirms supported auth.secret_key, jwt_secret, anon_key and service_role_key fields. Fresh secrets were generated locally and referenced through env() in supabase/config.toml; working values are only in ignored root .env, whose ACL is restricted to the current Windows user. .env.local remains unchanged. No values were printed or added to documentation/source. Vite verification confirmed private API/JWT/service credentials are absent from the transformed frontend client; only its matching public client key is included.

Supported CLI stop/start retained database and Storage named volumes and existing data. Existing version metadata preserved PostgreSQL image 17.6.1.171, Auth v2.197.0, PostgREST v14.18 and Storage v1.77.5. The asymmetric signing key was deliberately preserved. Existing five migration entries, the retained Visitor user role, zero exhibits and six/eight taxonomy rows were verified after restart. No migration push/reset occurred. Edge and local Vite were restarted in persistent sessions, exact-origin CORS reapplied through the existing scoped helper, and all privileged flags/editor gate verified false. Optional Vector health was not used as a reason to change data or logging infrastructure.

**Both the formerly exposed modern secret key and legacy service_role JWT are now rejected** by the local REST gateway/API. Replacement modern secret and legacy service JWT successfully performed the approved read-only security-setting verification. A fresh normal passwordless login for the same retained Visitor through local Mailpit (shouldCreateUser=false) also passed after rotation; its ordinary profile was loaded and the verification session logged out. No second user or password change was needed.

Two maintenance prerequisites initially failed before any service stop (Windows ACL invocation and host-process filtering); corrected commands completed safely. The first post-maintenance frontend check found its child Vite process had not survived the maintenance parent; independent persistent dev/Edge sessions resolved this, and only that affected check was repeated. No failed assertion was hidden or weakened.

### Remaining credential exposure and supported boundaries

The earlier modern API/legacy service-token exposure remains in historical conversation records, but those specific credential values have been invalidated. Public publishable/anon identifiers are not independently privileged; dependent legacy anon/service values were replaced as part of the rotation. Sharing/export/retention of affected conversations and copies still requires operator containment.

The current database password matches the CLI development default. The S3 access identifier/secret pair also matches the exact v2.118.0 default configuration; these are not customized values. A persistent execution record at line 4751 of the original October 4 session log contains exact S3 default matches in payload/item/aggregated_output. The bounded scan did not locate an unredacted current CORE loopback database URL/password in the inspected completed-tool records; earlier reported database connection disclosure is nevertheless treated conservatively because the live password is the known development default. No credential values are reproduced here.

**Database and S3 credentials were not rotated.** Replacing the database credential requires coordinated database-role/connection updates across database clients and dependent services (Auth, API, Storage, realtime, meta/Studio and enabled analytics/pooling). S3 changes affect Storage's S3 authentication and any S3 clients, without requiring blob deletion. In this CLI release S3 credential fields are internal (toml/json excluded); no supported complete database/S3 rotation path was established for the current CLI-managed stack. The vendor's self-hosted Compose rotation utilities apply to that deployment model, not directly to these CLI-generated containers. They were not run or adapted as an improvised workaround.

The preserved asymmetric signing key also matches the CLI's published development default. It was not newly disclosed in a diagnostic or rotated under the approved compatibility scope. Treat the stack as trusted local development infrastructure, not hardened credentials suitable for wider access; a later operator maintenance authorization should address development-default signing material as part of the supported deployment configuration.

Docker's API binding was previously verified on all host interfaces; firewall/NAT reachability remains unverified. Database/S3 defaults and default signing material are consequential if the host is reachable. Restrict network access and protect retained logs/backups; CORS and disabled application gates do not revoke direct privileged credentials.

### Final verification and changed files

Exactly two focused groups were used: Visitor acceptance, and security/rotation-affected technical health. **14 final functional/health checks passed, zero unresolved failures, four explicit skips.** The supported rotation separately passed 17 maintenance assertions; encrypted-backup round-trip passed. Visitor runner took 9.812 seconds, initial health 2.746 seconds, maintenance 54.111 seconds, post-rotation checks 1.913 seconds plus the short single-runtime recheck. Total direct testing/maintenance execution remained well under ten minutes. No passing SQL suites, full Playwright matrix, image build or unrelated application regression suite was rerun.

Changed reviewable files: supabase/config.toml (approved Auth env references), this existing report and PROJECT_BACKEND_OVERVIEW.md. Ignored local artifacts: root .env, the encrypted backup and sanitized .tmp/phase06-final results. No application, visual, service-facade, test or migration source changed. Existing unrelated working-tree changes were preserved. The only account created was the explicitly authorized retained Visitor.

Official references: [tagged CLI Auth configuration](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/auth.go), [tagged CLI configuration/version handling](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/config.go), [tagged Storage configuration boundary](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/storage.go), [vendor self-hosted security/rotation documentation](https://supabase.com/docs/guides/self-hosting/docker). These references do not establish a drop-in rotation command for the existing CLI database/S3 defaults.

### Finite operator handoff to Phase 07

1. Contain access to exposed session records/copies and local ports. Protect the DPAPI rollback backup. A rollback restoring compromised credentials must stay isolated; restoring the backup is not credential invalidation.
2. Separately authorize and choose a vendor-supported maintenance/deployment configuration for database/S3 credential invalidation and development-default signing material. Back up all schemas/roles, Auth, receipts, volume/blob contents and current secrets first; quiesce writes, verify recoverability, preserve volumes/data, coordinate dependent clients, then demonstrate old credentials rejected. No blind container patch, reset or unapproved password/session change is authorized by this handoff.
3. If retaining an empty catalog, retain the explicit content/media acceptance limitation. Otherwise an authorized content operator must publish legitimate exhibits/assets through existing CMS and verify real selection, bilingual information and available media. No placeholder data was created for a passing test. Visitor deletion still requires separate approval.
4. Before any production deployment, complete separately authorized Admin/editor acceptance, deployed RLS/RPC/Storage/receipt/concurrency checks, SMTP/redirect/recovery and target backup/migration-state review. Keep privileged gates disabled until their target-specific prerequisites are met.

Phase 06 development work ends with this definitive blocked acceptance and operator handoff. Phase 07 is the next development handoff, not started here; no additional Phase 06 development iteration is proposed.
