# Introduction

Welcome to the ALTERED codebase! We're building the next generation of knowledge infrastructure. Since we are a data-first generalist platform... the foundations really matter. Let's aim for functional perfection.

# \[TEMPORARY\] Codebase Migration

- We are currently working to re-build the ALTERED app from scratch in this repo (often referenced as the "old" codebase). For any given implementation, first inspect the project for any relevant patterns (including relevant git branches and stashes) at `/Users/inducingchaos/Workspace/containers/altered/`, and copy the code directly in a way that fits the current objective. There are other `altered-*/` projects also in `containers/` (as well as a sub-path inside the `rileybarabash/` project), each an older version that I rebuilt from scratch in search of a better architecture - these older projects will rarely be useful, but can be referenced for tougher problems or deeper inspiration. Weigh their significance using the average date of the last 2-3 developmental commits.

- If you have suggestions for better naming, structuring, or any other sort of improvements over the old codebase, always suggest them before copying the existing patterns.

# Context

- Before planning or implementation, always read `.context/_generated/STATE.md` and update it after each substantial turn to keep the plan execution synchronized.

- Read `.context/PRODUCT.md` before starting any product or domain-specific work.

- For a user-defined, macro-level definition of the direction and goal for the project, read `.context/CURRENT.md`. This file helps us align all AI-generated plans and execution with the higher intent of the developer.

# Chat

- If you see a flaw or de-optimization in the user's choices, point them out with no mercy. Be raw, clear, and effective. Question directly when needed.

# ADD Mode

- ADD mode means Agent Driven Development: the agent owns and operates the `agents/main` branch as an independent fork of the human-owned app.

- Never write to `main` or any branch that is not prefixed with `agents/` while ADD mode is active. Treat `main` as the upstream human source of truth, and keep `agents/main` updated from it by rebasing or merging when needed.

- Use `agents/main` for direct commits when the change is cohesive. Use `agents/<feature>` branches when the work benefits from isolation, then merge them back into `agents/main`.

- Code review is intentionally disabled on `agents/*` branches. The agent has permission to override, replace, restructure, or delete anything in the codebase when operating inside ADD mode, including prior agent work.

- Preserve human-owned intent, product direction, and secrets boundaries even when rewriting code. Prefer separate ADD-mode infrastructure, including a distinct database or database branch, separate iMessage number, separate provider credentials, and separate deployment environment variables.

- Keep ADD-mode instructions current in this file whenever the workflow changes. If branch-specific runtime setup becomes concrete, document the required environment variables and infrastructure ownership before relying on them.

- On `agents/*`, always load environment variables explicitly from `.env.agents` (never rely on implicit `.env` loading).

# Workflow

- Never start any long-running processes or persistent tasks (such as a dev server) unless explicitly asked.

- Always use `pnpm exec` or `pnpm dlx` over `npx` and alternatives.

- Interact with Git in a read-only way unless the user makes an explicit request.

- Always run a typecheck, lint, and format pass after every reasonable set of changes with `pnpm check`.

- Prefer more fine-grained files over less all-in-one files.

- Generate code in small, manageable chunks of 2-3 main functions, files, or topics at a time - then end your turn so that the code can be manually reviewed and committed. Never generate more than 80 lines or so unless the intent is explicit.

- Never add extra placeholder code or demonstrative cruft unless told to do so. I would prefer an incomplete or even non-functioning half-chunk of useful code, over a pile of useless showy code.

- The following glob patterns represent the blacklist for modifying files - never touch them without explicit instruction: `.context/**`, `AGENTS.md`. Exceptions: `.context/generated/**`.

- When saving a plan to the workspace, do so in `.context/_generated/plans`.

- ALWAYS provide a reminder at the end of each code generation turn for the user to review and update the agent context files. Pull all critical points from the latest messages and code changes into a list of suggestions, then provide them to the user within the chat.

- For database migrations with Drizzle, we should use `pnpm db:push` instead of manually writing migrations unless absolutely necessary.

# Style

- Make generous use of 1-line gaps between code lines within a block to increase readability. If 2-4 lines are semantically groupable, then it's acceptable to keep them together.

- We should aim for a minimal, yet scalable and functional, perfectionistic codebase. Our architecture and quality should never be sacrificed for the sake of speed, convenience, or otherwise.

- We should aim to cap complexity for cognitive load, efficiency, and maintenance reasons. This extends to advanced types, program composition, and anything else that could be deemed over-engineered or too heavy. As a solution, we can likely achieve the same capability and aesthetic by simply writing a bit more code, or doing it in a different way.

- For colors, I prefer a monochromatic palette with an optional, natural-tone accent color. Purpose-driven colors, such as status indicator colors may exist as well.

- I have a taste for minimalist brutalist design. This statement might seem contradictory, but at core it implies a controlled tension, deeply intentional design, and perfection in both neutrality and extremity. Think: balancing the bold and light with uniformity, negative space with density, and ranging styles with monotonous language. Every design decision is grounded in calculation.

- Our base-layer inspiration is [Midday.ai](https://midday.ai), mainly for their brutalist monochromatic UI design but also for their open source app architecture: https://github.com/midday-ai/midday.

# Conventions

- If a package version is likely to be shared across multiple apps or packages, always define it as a catalog item in the `pnpm-workspace.yaml` file. use `catalog` if the dependency has no obvious topic-based grouping, otherwise use `catalogs` with a minimalistic group name.

- Inline comments should have 2 spaces before the content to aesthetically match indentation, rather than 1 space: `//  <content>`.

- TSDoc definitions should always be in their expanded, multiline form.

- TODOs should follow the format `@todo P<0-3>: <description>` for TSDoc, and `TODO P<0-3>: <description>` for inline comments.

- All (non-data) commentary text (TODOs, remarks, etc.) should use proper sentence grammar, including proper capitalization punctuation (including periods).

- Comments should use the `@remarks` flag in TSDoc.

- For human-readable IDs (any textual key that is not random), I prefer a kebab-case as our primary format. If the ID style has a very strong associative tie to its implementation (such as snake_case for database tables), use that format instead.

- Don't litter our code with comments unless absolutely necessary. If I don't understand something, or it's a special implementation that requires explanation, or a TODO is needed, then a comment is appropriate. Keep it extremely minimal with only the details needed.

- When generating code segments that allow block-statements such as "if" conditions or "for" loops, prefer to inline the logic if possible, condensing it into a single line.

- Prefer the use of types over interfaces when possible.

- We should maintain a feature-based `domains/` folder structure inside applications (e.g. where runtime framework entrypoints and configurations live). Shared packages (under `packages/`) should group by feature at `src/<feature>/` without an extra domains segment unless a single package intentionally mixes unrelated top-level concerns.

- Plumb key infrastructure such as logging, retries, and concurrency consistently from the start to ensure the codebase is optimized for scale, observability, durability, etc.

- Design common utility pipelines such as data CRUD functions or agent orchestration workflows to be case-agnostic for re-use and composability.

# Technologies

- We should use pnpm as our preferred stable package manager.

- Our repo base should be a Turborepo.

- We should use Biome as our formatter with Ultracite defaults configured.

- For new web applications, we should consider Next.js as a primary option with Tanstack Start as a runner-up. Since I'm more familiar with Next.js, that should be our starting point.

- Use Effect as a first-class TypeScript library for anything it can solve. Use the latest beta release. You can use the "unstable" APIs when necessary with consideration.

- We will use Neon as our free-tier database and experiment with Convex where appropriate. We will eventually migrate to PlanetScale when financially sustainable.

- When using SQL, we should use Drizzle as our ORM, and use the latest `1.0.0-beta` release until a stable version of v1 has shipped.

- Better Auth is our auth framework of choice.

- For frontend async state management, we should use React Query.

- We should use Hono as HTTP server framework, set up for serverless on Vercel. I've considered using the HTTP and RPC modules from Effect, but those are not serverless-ready (I prefer the ergonomics of serverless). I've used tRPC and oRPC up until this point but since we're adding Effect, I want to reduce library overlap and use Hono-wrapped Effect functions with Hono RPC as a lighter-weight alternative. Since we're not bundling the functions with Next.js we will need to manually implement skew protection (or, just really good API error handling).

- I prefer Vercel for almost all deployments, but when it falls short (e.g., for long-running servers) I choose Railway.

- Use Upstash as the go-to for any of their popular services such as Redis, message queuing, etc.

- To use AI, we should use Vercel's AI SDK with the OpenRouter adapter.

- I prefer using ArkType over Zod.

- For almost all unique ID requirements, let's use the `nanoid` library with the default alphabet and 21-character length.

- For any substantial programmatic video generation, prefer Remotion.

- For message-based agent integration, we will use iMessage via the Vercel Chat SDK and the Sendblue adapter. In the future, we may migrate from Sendblue to the Linq Blue API for features and reliability (costs much more, but it may be worth it).

# Documentation

- When using Effect, until v4 is stable, always fetch the migration docs: `https://raw.githubusercontent.com/Effect-TS/effect-smol/refs/heads/main/MIGRATION.md`. Then, if you want info about any non-obvious APIs, fetch `https://effect.website/llms-full.txt`. Lastly, some functions cannot be found in the documentation, so consider searching the source code directly.

# Configuration

- Never modify the package.json `exports` entries of any package that uses a `"./*": "./src/*.ts"` pattern. This allows us to use dynamic import paths without having to specify them individually, or revert to using a performance-heavy barrel file pattern.

- Regarding `turbo.json` and environment variables for caching, only add newly-used variables in the co-located `turbo.json` of the consuming application - not in packages. Only add them for tasks that have caching enabled (e.g. `build`). `globalPassThroughEnv` should only be used for system environment variables.

- Do not add redundant configurations to files like `vercel.json` if the consuming tool can auto-detect or use a reasonable default.

# Repository Structure

- Deployable apps (under `apps/`) should be a thin configuration shell for each build that simply re-exports imported modules from the respective composition package. Each composition package (under `packages/<app_name>*/`) should combine all necessary layers for a build using the remaining scoped workspace packages. Each scoped package denotes to a specific axis and variant of the structure we outline in this section.

## Axes of Intention

- Server vs client (and shared): split for data & credential security, source code privacy, runtime isolation, and separation of concerns.

- 3-tier quality grade separation & release channel staging: stable (default - aligned, perfected, low churn), pre-release (generally useful & reliable, may be pruned/revised), and experimental (initial working, human-approved prototype).

- Public vs internal features: defines a build variant that extends the app with team-only behavior.

- Lightweight bundle optimization: for limited clients and incompetent bundlers (e.g. Raycast extensions and their memory management), size-based package boundaries may be necessary.

### Package Inheritance

- For each tiered package variant, each less-refined edition should import and extend its successor. An example of this could be `@altered/core-experimental` importing `@altered/core-pre-release`, or `@altered/core-pre-release` importing `@altered/core` (stable). Composition packages follow the same pattern as scoped packages to form a layered inheritance graph without code duplication.

- Secondary variant chains such as `internal` are stacked as their own standalone inheritance tree - defining a separate layer for each variant rather than extending the primary code path (the release channel chain). Then, at the composition layer (the top-level packages that apps import), these layers are merged with the primary code path in their respective variants.
