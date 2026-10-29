# CORE AI — shared provider contract

The original Phase 09B record below is retained. Its mock-only configuration and reserved server policies are superseded by the **OpenCode integration (2026-10-28)** section at the end of this document.

Phase 09B ships one shared chat UI (`CoreAIPanel`) and one explicit default client configuration: `provider: 'mock'`. `MockCoreAIProvider` uses local bilingual knowledge and the authoritative assembly validator. It performs no inference, fetch, credential lookup or model installation. The museum compatibility adapter delegates to this same client. The earlier synchronous `curatorDemo` helper is retained for compatibility with historical tests; it no longer drives the visitor chat.

## Current contracts

- `CoreAIRequest`: bounded user question, `en`/`fa` locale, and a discriminated museum / assembly / troubleshooting context.
- Museum context is constructed from the selected published UUID in the loaded visitor catalog, respects `enableAiCurator`, and copies only the title, description, category and recorded specifications. No profile, session token, email or storage credential enters the request.
- Assembly context copies installed slots, connected required leads, selected part/lead, current target and next step. Troubleshooting adds a scenario ID, attempts and validation findings. The mock recomputes findings with `bootIssues`; supplied findings cannot declare a broken build successful.
- `CoreAIResponse`: answer, provider provenance, offline marker, certainty and topic identifiers. Responses from a future inference provider must identify that provider and model; they cannot masquerade as demo output.
- `CoreAIError`: disabled, unconfigured, timeout, aborted, invalidContext or failed. The client applies cancellation and a bounded timeout. It does not silently fall back to another provider.
- `CoreAIConfig`: explicit mock / disabled / ollama / openai-compatible selection. Only mock is implemented; both real selections fail as unconfigured before any transport runs.
- `FutureServerPolicy` reserves rate-limit, timeout, deployment and fallback policy fields. Rate limiting and real-provider fallback are integration points, not active enforcement claims.

## Boundary for a later authorized provider

Keep privileged provider credentials in a server-side gateway. Revalidate authenticated ownership, request size, published exhibit identity and allowed context fields at that boundary; do not trust browser-supplied validation or let model prose modify mounts, wiring or boot status. Resolve any current catalog facts under the existing authorization policy. Strip credentials and unnecessary account data from prompts and logs. Enforce rate limits, output limits, timeouts and cancellation at the actual gateway.

For visitor-local Ollama, use an explicitly authorized local relay on the machine running Ollama, or a deliberately configured same-host deployment. A hosted Supabase Edge Function cannot assume that its `localhost` is the visitor's computer. A hosted OpenAI-compatible connection instead uses an authorized hosted gateway. Neither transport, gateway, endpoint nor secret is deployed by this phase.

Real-provider failure must remain a visible error. If a future product offers offline fallback, require an explicit user choice and visibly change the provider badge; never present curated mock output as successful live inference.

## Isolation and simulation

Chat transcripts are bounded to 20 messages, held only in memory and separated by authenticated owner, view/scenario/component and locale. Account change or sign-out destroys previous histories. Requests are cancelled on unmount/context change. No chat content is persisted in browser storage.

Troubleshooting operates on a temporary copy of a completed build or an explicit practice reference. The original required/optional state is saved while the copy is active, including on pagehide or reload. Returning restores the original build with power off. Scenario progress itself is intentionally transient; a reload restores the original assembly, not an interrupted fault. Seven faults use actual missing mounts or leads. Failed diagnostic power is a distinct `faulted` state that blocks rewiring/reseating until power is switched off. The existing placement/connection/boot rules remain authoritative.

The desktop uses the operator-requested Windows 11 Bloom wallpaper copied from the installed Windows artwork (source recorded in `public/images/assembly/ASSET_SOURCE.txt`), with a locally drawn educational taskbar and desktop after POST, OS boot and Welcome to CORE. It is not a bootable OS image, installed operating system or general desktop emulator. Existing keyboard/mouse simulation remains functional. Thermal physics, real POST codes, PSU internals, electrical behavior and automatic real-world diagnosis are outside the simulation.

## Direct monitor interaction follow-up

A connected simulated mouse maps actual pointer movement on the monitor mesh to normalized UV coordinates. A connected keyboard opens Notepad in the existing monitor texture. Clicking the screen focuses a native, visually hidden textarea bridge so real keyboard entry, line breaks, paste and composition feed the on-screen note; Escape releases focus. The bridge is disabled when the desktop/keyboard is unavailable and its listeners are cleaned up on unmount. Orbit input pauses while typing. The old external sliders/input are removed. Note text and pointer movement are runtime-only and neither enter AI context nor trigger durable assembly writes. The simulated desktop is not a complete text editor or operating system.

## OpenCode integration — 2026-10-28

One `CoreAIPanel`, the curator compatibility service and the existing Museum / Inspect / Assembly / Troubleshooting controls use `coreAIClient`. `OpenCodeCoreAIProvider` is a typed browser gateway adapter; only `supabase/functions/core-ai` calls inference. `MockCoreAIProvider` remains independent and available to tests and the explicit offline choice. No assistant, validator, database schema or persistent chat store was replaced.

### Selection and provenance

- Default configuration is `provider: 'auto'`: query the authenticated server's nonbillable `status`, then select mock only when the server explicitly reports no key. `createCoreAIClient({provider:'mock'})` still creates a deterministic network-free client. Explicit `opencode` requires its matching provider adapter; unsupported legacy choices remain unconfigured.
- Server with no key: `Offline Demo`. Configured server: `OpenCode ready · <model>`; this verifies configuration only, **not credentials or inference**. A successful answer changes the panel to `Live AI`. No automatic inference retry exists. A status check happens before submission to discover server-only configuration changes without rebuilding the frontend.
- An unreachable/unserved function, expired session, invalid key or upstream failure is a visible error. The user can explicitly choose Offline Demo or manually check/retry. Live failures never trigger a mock answer. Each stored assistant message records its provider/model, so earlier offline messages retain their offline label after mode changes.
- Connecting, generating, rate-limited, unavailable and authentication-required messages are localized EN/FA; RTL is retained. Cancellation aborts browser transport and the server's outbound work where supported. Cancellation cannot promise that already-started upstream usage is unbilled.

### Wire contracts

`POST /functions/v1/core-ai`, `Authorization: Bearer <current Supabase user access token>`, public Supabase `apikey`, `Content-Type: application/json`, exact approved `Origin`. Supabase JWT verification stays enabled, followed by `auth.getUser` and the existing `core_current_role` RPC. Ordinary authorized users, editors and admins may ask; Supabase anonymous users, absent/revoked identities and roles denied by the existing banned/deleting/unconfirmed-account rules cannot. No service-role client or new authorization policy is used.

Status request: `{action:'status'}`. Success: `{ok:true,data:{provider:'mock'|'opencode',configured:boolean,model?:string,authenticatedOnly:true,inferenceVerified:false}}`. This never calls OpenCode.

Ask request:

```ts
{
  action: 'ask', question: string, locale: 'en' | 'fa',
  conversationId?: string, // random UUID, memory only
  history?: {role:'user'|'assistant',text:string}[],
  context:
    | {kind:'museum',exhibitId:string|null}
    | {kind:'assembly',build:{installed,connected},selected,simulation?:{power,panelOpen}}
    | {kind:'troubleshooting',build:{installed,connected},selected,scenario,attempts,simulation?:{power,panelOpen}}
}
```

Success: `{ok:true,data:{answer,provider:'opencode',offline:false,model,certainty:'generated',topics:string[]}}`. `generated` describes model output, not a claim of factual verification. No reasoning, usage billing metadata, upstream headers or tool calls are returned. Empty, malformed, oversized and credential-containing upstream answers reject.

Safe failure: `{ok:false,error:CoreAIErrorCode}`. Caller-auth failures use 401; forbidden origin/access/upstream permission uses 403; local/upstream throttling uses 429 with `Retry-After: 60` (provider or hourly limits may last longer); invalid request/context uses 400; deadline uses 504; cancellation uses 408; missing configuration, invalid provider key, network and malformed upstream failures use 503. Provider 401 maps to `invalidProviderKey`, distinct from CORE authentication. Other provider failures, including credits/payment errors, map to `providerUnavailable`. Raw provider failures are discarded without logging or reflecting them.

### Context and privacy

Museum and Inspect transmit only the selected UUID. The server queries exactly that `published` exhibit with `enable_ai_curator=true` and up to 12 ordered specification rows, under the caller's RLS. It uses only the requested locale, title (180 chars), description (1,200), category identity (80), spec labels (80) and values (180); client catalog facts are never accepted. Null selection allows general guidance without asserting exhibit facts. Drafts and disabled/missing exhibits reject, including for admin callers.

Assembly transmits required installed slots/connected leads, selected component and optional simulated power/panel state, excluding optional-device data and desktop text. The server validates the fixed reference build with `validBuild`, recomputes next work, component targets/dependencies, all connector endpoints and `bootIssues`. Troubleshooting adds a validated scenario/attempt count; server-authored EN/FA symptoms, hint and explanation are selected from the existing lesson definitions. Client findings and next-step claims are ignored. Simulation data is labeled untrusted client input, never a claim about actual hardware. Model prose cannot change any state or execute actions.

At most six recent relevant messages (1,000 characters each) from the owner/context/locale-scoped in-memory conversation are submitted. Offline assistant prose is excluded from live history. The existing 20-message UI bound and account-change clearing remain. No chat persistence, logging or analytics was added. Profiles, emails, raw account IDs, browser session tokens, private files and the full catalog are not inserted into prompts. Only the provider key authenticates the upstream HTTP request. Known server/session secrets, email addresses and recognizable bearer/JWT/key patterns in text are redacted; users must not paste personal data or secrets into chat. A SHA-256 pseudonymous conversation header supports provider routing; it contains no raw user ID. Provider retention is governed by its terms; browser-only storage does not imply provider-side non-retention.

### Limits and deployment

- Stream-read input cap: 20,000 bytes; question cap: 1,000 chars; history cap: six × 1,000 chars. The gateway sets `stream:false`, `max_tokens:700`, a 20-second whole-request deadline, a 65,536-byte upstream JSON cap and an 8,000-character answer cap. Browser transport adds bounded status (8s) and inference (25s) deadlines.
- Authenticated-only per-isolate rate enforcement: six inference attempts/minute and 30/hour/user; one concurrent request/user; 120 total attempts/hour/isolate; at most 2,000 retained user counters. Invalid upstream attempts count. Expired counters are pruned. Status never consumes inference quota. Counters are in memory and reset on worker replacement; **they are not a global distributed cost ceiling**. Broad public/anonymous billable rollout is not enabled: distributed quotas, account-abuse controls and provider workspace budget enforcement are additional production-scale infrastructure. No database migration or existing contract modification was made to simulate such a guarantee.
- Exact-origin CORS defaults only to `http://127.0.0.1:5191` and `http://localhost:5191`. Set `CORE_AI_ALLOWED_ORIGINS` to real deployment origins; wildcard/null/missing origins reject. CORS supplements authentication, rather than replacing it.
- Server secrets belong in ignored `E:\core\supabase\functions\.env` locally or Supabase Edge Function Secrets when hosted. An existing secret file is preserved; `.env.example` contains no credential. Only the existing public Supabase URL/key are used in Vite. No provider key is bundled.
- Defaults: `OPENCODE_MODEL=kimi-k3`, `OPENCODE_API_URL=https://opencode.ai/inference/openai/v1/chat/completions`. Official model compatibility and Bearer auth were checked against [Inference](https://opencode.ai/v2/docs/console/api/inference) and [Models](https://opencode.ai/v2/docs/console/models). The supported override is `https://opencode.ai/inference/go/openai/v1/chat/completions`; arbitrary hosts and redirects reject to protect credentials. Other model IDs must support this API family; choosing a different family fails visibly rather than switching protocols. [Go](https://opencode.ai/v2/docs/console/go/) is documented for coding-agent traffic: the operator must confirm this educational application's eligibility. No subscription bypass, free-tier assumption or claim that ChatGPT Plus funds OpenCode exists.

See [the Persian setup guide](OPENCODE_AI_SETUP_FA.md) for exact local/hosted steps, network-region checks and error diagnosis. This task does not start/reconfigure running backend services or deploy hosted functions. Remaining operator work: obtain supported key/access/credits, set the secret and exact deployment origins, restart/redeploy to the intended matching Supabase environment, then send one real question. A reachable function and authorized session are required; offline is an explicit option if the function is absent.

### Focused verification

`node --test tests/core-ai-opencode.test.ts`: **4/4 passed**, 265 ms total. All HTTP inference was intercepted with synthetic credentials/fixtures. Checked missing-key offline selection, normalized live provenance and Go routing, redacted prompt data, 401/403/429/network/malformed/timeout/cancellation failures without fallback or retries, CORS/auth/input limits, validated museum facts, deterministic assembly context and Persian cooling diagnostics. No live inference, actual Auth/RLS deployment acceptance or region connectivity is claimed. Typecheck, changed-file ESLint and production-build results are recorded in Phase 09 progress.
