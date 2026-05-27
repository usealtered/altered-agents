# PLAN STATE (Generated)

Last updated: 2026-05-27

## ADD deployment memory

- Agent deployment project (Vercel): `api-experimental-agents` (under `altered` team).
- Treat `api-experimental` (non-`-agents`) as out-of-scope for ADD runtime operations.
- Agent runtime origin (`API_ORIGIN_PRODUCTION`): `https://agents.experimental.api.usealtered.com`.
- ADD runner callback URL should use: `https://agents.experimental.api.usealtered.com/webhooks/add-runner`.
- Trigger task id (`ADD_TRIGGER_TASK_ID`): `add-execute-job`.
- Branch policy is now root-scoped only: `main` and `job-*`; legacy prefixed branch compatibility is removed.

## Focus

Current focus is the iMessage POC path with production webhook flow, owned Postgres memory, and controlled local-dev routing for rapid message testing.

## Plan linkage

- Primary vertical scaffold:
  - `.context/_generated/plans/imessage-server-poc.md`

- Detailed adapter/history resolution:
  - `.context/_generated/plans/chat-sdk-history-sendblue-adapter-resolution.md`

- Architecture constraints:
  - `.context/_generated/plans/monorepo-architecture.md`

- Human pacing / multi-bubble roadmap (not MVP timing engine):
  - `.context/_generated/plans/imessage-human-timing-emulation.md`

## Confirmed status

- Adapter fork baseline and DM routing for direct messages: **completed**.

- Drizzle CLI integration in `@altered/server-experimental`:
  - `drizzle.config.ts` with repo-root `.env` load and required `SHARED_STORAGE_DATABASE_URL`.
  - Scripts: `push:db`, `view:db` (+ root aliases `db:push`, `db:studio`).
  - Package-level `turbo.json` env wiring for DB tasks.
  - `pnpm check`: **passing**.

- Owned history data-access layer:
  - Conversation resolution by thread id via `external_resources`.
  - Reset/new conversation flow by re-pointing active thread anchor.
  - Message save/list helpers and message-to-model transform.

- Memory-backed AI response loop:
  - Persist inbound user message.
  - Load conversation history from Postgres.
  - Generate assistant reply from model messages.
  - Persist assistant reply.
  - Status: **working in manual verification**.

- Command trigger behavior:
  - `/reset`, `/new`, `/clear` behavior corrected in latest iteration.

## Repository layout (this slice)

- **Environment/config:** `packages/core-experimental/src/config/environment.ts` (includes **`shared.identity.adminPhoneNumber`** from **`SHARED_ADMIN_PHONE_NUMBER`**, defaults to **`""`** when unset to disable gated behavior).

- **AI generation:** `packages/server-experimental/src/ai/generate/response-from-model-messages.ts`.

- **Chat persistence helpers:**
  - `packages/server-experimental/src/chat/conversations/get-or-create-active-for-thread.ts`
  - `packages/server-experimental/src/chat/conversations/start-new-for-thread.ts`
  - `packages/server-experimental/src/chat/messages/save.ts`
  - `packages/server-experimental/src/chat/messages/list-for-conversation.ts`
  - `packages/server-experimental/src/chat/messages/to-model-messages.ts`

- **iMessage direct-message flow:**
  - `packages/server-experimental/src/chat/providers/imessage/events/direct-message/handler.ts`
  - `packages/server-experimental/src/chat/providers/imessage/events/direct-message/build-response.ts`
  - `packages/server-experimental/src/chat/providers/imessage/events/direct-message/is-command-trigger.ts`

- **Database schema wiring:**
  - `packages/server-experimental/src/storage/database/schema.ts` now exports `{ conversations, chatMessages, externalResources }`.
  - `packages/server-experimental/src/storage/database/relations.ts` aligned to `chatMessages`.
  - `packages/server-experimental/src/storage/database/external-resources/*` includes `thread` type and provider-aware id resolution.

## Completion map (high-level)

- Owned Postgres history schema + relations + data access: **completed for POC scope**.

- Memory-backed direct-message response path: **completed for POC scope**.

- Message-id dedupe for replay/webhook duplicates: **queued (not started)**.

- Production-to-dev rerouting from one webhook endpoint: **next planned work**.

- Effect conversion/retries/hardening pass: **deferred until post-POC stabilization**.

## Current risks and caveats

- Dedupe is not implemented yet; duplicate provider deliveries can still create repeated message rows/replies.

- Local/prod split testing currently requires standard deployment/tunnel switching; no in-band dev forwarding command yet.

- Keep Chat SDK thread iterators out of LLM truth path; Postgres remains canonical for context.

## Next execution order

1. Implement production webhook forwarding to local tunnel for **admin-only** **`/dev`** messages; strip routing prefix before persistence; on forward success return **`200` `OK`** from prod **without running** Chat SDK ingestion (same shape as `SendblueAdapter.handleWebhook` success responses). **Failure policy:** tunnel unreachable ⇒ return **`200` `OK`**, **no prod ingestion**, **no forward** (fixed response body; no thread side effects).

2. Add provider message-id dedupe guards in persistence path.

3. POC solidification: multi-bubble send pipeline (defer full timing emulation; see `.context/_generated/plans/imessage-human-timing-emulation.md`).

4. Final refactor/polish, then evaluate Effect migration effort for retries and error handling.
