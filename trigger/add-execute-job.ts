import { task } from "@trigger.dev/sdk"

type AddRunnerStatus =
    | "running"
    | "completed"
    | "failed"
    | "blocked"
    | "cancelled"

type AddExecutePayload = {
    jobId: string
    planId: string
    request: string
    summaryBullets: string[]
    detailBullets: string[]
    branchName: string
    repository: string
    syncFrom: string
    callbackUrl: string
    callbackSecret: string
    executionMode?: string
    githubToken?: string
    cursorApiKey?: string
    cursorModel?: string
}

type GitHubRefResponse = {
    object?: {
        sha?: string
    }
}

type GitHubCreateContentsResponse = {
    commit?: {
        sha?: string
    }
}

type CursorCreateAgentResponse = {
    agent?: {
        id?: string
        url?: string
    }
    run?: {
        id?: string
    }
}

type CursorRunResponse = {
    id?: string
    status?: string
    result?: string
    durationMs?: number
    git?: {
        branches?: Array<{
            repoUrl?: string
            branch?: string
            prUrl?: string
        }>
    }
}

function isAllowedBranch(branchName: string): boolean {
    return branchName === "main" || branchName.startsWith("job-")
}

function isAllowedRepository(repository: string): boolean {
    const allowed =
        process.env.ADD_ALLOWED_GITHUB_REPOSITORY?.trim() ||
        "usealtered/altered-agents"

    return repository === allowed
}

function getGitHubRunnerToken(): string | undefined {
    return process.env.ADD_RUNNER_GITHUB_TOKEN?.trim()
}

function getGitHubApiBaseUrl(): string {
    return "https://api.github.com"
}

function getCursorApiBaseUrl(): string {
    return (
        process.env.ADD_CURSOR_API_BASE_URL?.trim() || "https://api.cursor.com"
    )
}

function getCursorApiKey(): string | undefined {
    return (
        process.env.ADD_CURSOR_API_KEY?.trim() ||
        process.env.CURSOR_API_KEY?.trim()
    )
}

function getCursorModel(): string {
    return process.env.ADD_CURSOR_MODEL?.trim() || "composer-2.5"
}

function toBase64(value: string): string {
    return Buffer.from(value, "utf8").toString("base64")
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function buildRunArtifactPath(jobId: string): string {
    return `.context/_generated/plans/add-jobs/runs/add-run-${jobId}.md`
}

function buildRunArtifactContent(payload: AddExecutePayload): string {
    return [
        "# ADD Runner Execution",
        "",
        `- Job ID: \`${payload.jobId}\``,
        `- Plan ID: \`${payload.planId}\``,
        `- Repository: \`${payload.repository}\``,
        `- Branch: \`${payload.branchName}\``,
        `- Sync source: \`${payload.syncFrom}\``,
        `- Triggered at: \`${new Date().toISOString()}\``,
        "",
        "## Request",
        "",
        payload.request,
        "",
        "## Summary Bullets",
        "",
        ...payload.summaryBullets.map(bullet => `- ${bullet}`),
        "",
        "## Detail Bullets",
        "",
        ...payload.detailBullets.map(bullet => `- ${bullet}`),
        ""
    ].join("\n")
}

function getCursorRunTimeoutMs(): number {
    const raw = process.env.ADD_CURSOR_RUN_TIMEOUT_MS?.trim()
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
    if (!Number.isFinite(parsed) || parsed <= 0) return 240_000

    return parsed
}

function buildRepositoryUrl(repository: string): string {
    return `https://github.com/${repository}`
}

function buildCursorExecutionPrompt(payload: AddExecutePayload): string {
    const summary = payload.summaryBullets
        .map(bullet => `- ${bullet}`)
        .join("\n")
    const details = payload.detailBullets
        .map(bullet => `- ${bullet}`)
        .join("\n")

    return [
        "You are implementing one approved ALTERED ADD job.",
        "",
        `Job ID: ${payload.jobId}`,
        `Plan ID: ${payload.planId}`,
        `Target branch (must stay on this branch): ${payload.branchName}`,
        "",
        "Primary request:",
        payload.request,
        "",
        "Summary bullets:",
        summary || "- (none)",
        "",
        "Detail bullets:",
        details || "- (none)",
        "",
        "Execution requirements:",
        "- Implement the requested feature end-to-end in the current repository.",
        "- Keep changes minimal, production-oriented, and aligned with existing architecture.",
        "- Run pnpm check before finishing.",
        "- Commit all relevant changes to the current branch with a concise message.",
        "- Do not create or switch to other branches.",
        "- Return a short final report with: what changed, checks run, and any remaining risks."
    ].join("\n")
}

async function callGitHub<T>(input: {
    method: "GET" | "POST" | "PUT"
    path: string
    token: string
    body?: Record<string, unknown>
}): Promise<{ status: number; json: T | null }> {
    const response = await fetch(`${getGitHubApiBaseUrl()}${input.path}`, {
        method: input.method,
        headers: {
            authorization: `Bearer ${input.token}`,
            accept: "application/vnd.github+json",
            "x-github-api-version": "2022-11-28",
            ...(input.body ? { "content-type": "application/json" } : {})
        },
        body: input.body ? JSON.stringify(input.body) : undefined
    })

    if (response.status === 204) return { status: response.status, json: null }

    const text = await response.text()
    if (!text) return { status: response.status, json: null }

    try {
        return { status: response.status, json: JSON.parse(text) as T }
    } catch {
        return { status: response.status, json: null }
    }
}

async function callCursorApi<T>(input: {
    method: "GET" | "POST"
    path: string
    apiKey: string
    body?: Record<string, unknown>
}): Promise<{ status: number; json: T | null }> {
    const authToken = Buffer.from(`${input.apiKey}:`, "utf8").toString("base64")

    const response = await fetch(`${getCursorApiBaseUrl()}${input.path}`, {
        method: input.method,
        headers: {
            authorization: `Basic ${authToken}`,
            accept: "application/json",
            ...(input.body ? { "content-type": "application/json" } : {})
        },
        body: input.body ? JSON.stringify(input.body) : undefined
    })

    if (response.status === 204) return { status: response.status, json: null }

    const text = await response.text()
    if (!text) return { status: response.status, json: null }

    try {
        return { status: response.status, json: JSON.parse(text) as T }
    } catch {
        return { status: response.status, json: null }
    }
}

async function getRefSha(input: {
    repository: string
    ref: string
    token: string
}): Promise<string | null> {
    const response = await callGitHub<GitHubRefResponse>({
        method: "GET",
        token: input.token,
        path: `/repos/${input.repository}/git/ref/heads/${encodeURIComponent(input.ref)}`
    })

    if (response.status === 404) return null
    if (response.status < 200 || response.status >= 300)
        throw new Error(
            `Failed to read branch ref ${input.ref} (${response.status}).`
        )

    return response.json?.object?.sha ?? null
}

async function ensureBranchExists(input: {
    repository: string
    branchName: string
    syncFrom: string
    token: string
}): Promise<void> {
    const existing = await getRefSha({
        repository: input.repository,
        ref: input.branchName,
        token: input.token
    })

    if (existing) return

    const baseSha = await getRefSha({
        repository: input.repository,
        ref: input.syncFrom,
        token: input.token
    })

    if (!baseSha)
        throw new Error(`Sync branch was not found: ${input.syncFrom}.`)

    const createResponse = await callGitHub({
        method: "POST",
        token: input.token,
        path: `/repos/${input.repository}/git/refs`,
        body: {
            ref: `refs/heads/${input.branchName}`,
            sha: baseSha
        }
    })

    if (createResponse.status < 200 || createResponse.status >= 300)
        throw new Error(
            `Failed to create branch ${input.branchName} (${createResponse.status}).`
        )
}

async function commitRunArtifact(input: {
    payload: AddExecutePayload
    token: string
}): Promise<string> {
    const path = buildRunArtifactPath(input.payload.jobId)
    const content = buildRunArtifactContent(input.payload)

    const response = await callGitHub<GitHubCreateContentsResponse>({
        method: "PUT",
        token: input.token,
        path: `/repos/${input.payload.repository}/contents/${encodeURIComponent(path)}`,
        body: {
            message: `chore: execute add job ${input.payload.jobId}`,
            content: toBase64(content),
            branch: input.payload.branchName
        }
    })

    if (response.status < 200 || response.status >= 300)
        throw new Error(
            `Failed to commit run artifact to ${input.payload.branchName} (${response.status}).`
        )

    const sha = response.json?.commit?.sha
    if (!sha) throw new Error("Commit SHA was missing from GitHub response.")

    return sha
}

async function createCursorCloudRun(input: {
    payload: AddExecutePayload
    cursorApiKey: string
    cursorModel: string
}): Promise<{ agentId: string; runId: string; agentUrl: string | null }> {
    const response = await callCursorApi<CursorCreateAgentResponse>({
        method: "POST",
        apiKey: input.cursorApiKey,
        path: "/v1/agents",
        body: {
            prompt: {
                text: buildCursorExecutionPrompt(input.payload)
            },
            model: {
                id: input.cursorModel
            },
            repos: [
                {
                    url: buildRepositoryUrl(input.payload.repository),
                    startingRef: input.payload.branchName
                }
            ],
            workOnCurrentBranch: true,
            autoCreatePR: false,
            skipReviewerRequest: true
        }
    })

    if (response.status < 200 || response.status >= 300)
        throw new Error(
            `Failed to create Cursor agent run (${response.status}): ${JSON.stringify(response.json)}.`
        )

    const agentId = response.json?.agent?.id
    const runId = response.json?.run?.id

    if (!agentId || !runId)
        throw new Error(
            "Cursor create response was missing agent/run identifiers."
        )

    return {
        agentId,
        runId,
        agentUrl: response.json?.agent?.url ?? null
    }
}

function isCursorRunTerminal(status: string): boolean {
    return (
        status === "FINISHED" ||
        status === "ERROR" ||
        status === "CANCELLED" ||
        status === "EXPIRED"
    )
}

async function waitForCursorRun(input: {
    agentId: string
    runId: string
    cursorApiKey: string
}): Promise<CursorRunResponse> {
    const startedAt = Date.now()
    const timeoutMs = getCursorRunTimeoutMs()

    while (Date.now() - startedAt < timeoutMs) {
        const response = await callCursorApi<CursorRunResponse>({
            method: "GET",
            apiKey: input.cursorApiKey,
            path: `/v1/agents/${encodeURIComponent(input.agentId)}/runs/${encodeURIComponent(input.runId)}`
        })

        if (response.status < 200 || response.status >= 300)
            throw new Error(
                `Failed to read Cursor run status (${response.status}): ${JSON.stringify(response.json)}.`
            )

        const run = response.json
        const status = run?.status
        if (run && typeof status === "string" && isCursorRunTerminal(status))
            return run

        await sleep(3000)
    }

    throw new Error(`Timed out waiting for Cursor run ${input.runId}.`)
}

async function sendRunnerCallback(
    payload: AddExecutePayload,
    input: {
        status: AddRunnerStatus
        errorMessage?: string
        metadata?: Record<string, unknown>
    }
) {
    const response = await fetch(payload.callbackUrl, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${payload.callbackSecret}`
        },
        body: JSON.stringify({
            jobId: payload.jobId,
            status: input.status,
            errorMessage: input.errorMessage,
            metadata: input.metadata
        })
    })

    if (!response.ok)
        throw new Error(
            `Runner callback failed with status ${response.status}: ${response.statusText}.`
        )
}

function getExecutionMode(payload: AddExecutePayload): string {
    return (
        payload.executionMode?.trim() ||
        process.env.ADD_TRIGGER_EXECUTION_MODE?.trim() ||
        "noop"
    )
}

function isSupportedExecutionMode(mode: string): boolean {
    return mode === "noop" || mode === "repo-write" || mode === "cursor-cloud"
}

async function executeRepoWriteMode(input: {
    payload: AddExecutePayload
    token: string
    startedAt: number
    executionMode: string
}) {
    const commitSha = await commitRunArtifact({
        payload: input.payload,
        token: input.token
    })

    await sendRunnerCallback(input.payload, {
        status: "completed",
        metadata: {
            notes: [
                "Runner committed ADD execution artifact to repository branch."
            ],
            commitSha,
            durationMs: Date.now() - input.startedAt,
            executionMode: input.executionMode
        }
    })

    return { ok: true, commitSha }
}

async function executeCursorCloudMode(input: {
    payload: AddExecutePayload
    token: string
    startedAt: number
    executionMode: string
}) {
    const cursorApiKey = input.payload.cursorApiKey?.trim() || getCursorApiKey()
    if (!cursorApiKey) {
        await sendRunnerCallback(input.payload, {
            status: "blocked",
            errorMessage: "Missing ADD_CURSOR_API_KEY (or CURSOR_API_KEY).",
            metadata: {
                notes: ["Set Cursor API key for cursor-cloud execution mode."]
            }
        })

        return { ok: false }
    }

    const cursorModel = input.payload.cursorModel?.trim() || getCursorModel()

    const createdRun = await createCursorCloudRun({
        payload: input.payload,
        cursorApiKey,
        cursorModel
    })

    await sendRunnerCallback(input.payload, {
        status: "running",
        metadata: {
            notes: ["Cursor cloud run created for ADD job execution."],
            cursorAgentId: createdRun.agentId,
            cursorRunId: createdRun.runId,
            cursorAgentUrl: createdRun.agentUrl,
            cursorModel,
            executionMode: input.executionMode
        }
    })

    const cursorRun = await waitForCursorRun({
        agentId: createdRun.agentId,
        runId: createdRun.runId,
        cursorApiKey
    })

    const commitSha =
        (await getRefSha({
            repository: input.payload.repository,
            ref: input.payload.branchName,
            token: input.token
        })) ?? null

    const matchedBranch =
        cursorRun.git?.branches?.find(
            branch => branch.branch === input.payload.branchName
        ) ?? cursorRun.git?.branches?.[0]

    if (cursorRun.status === "FINISHED") {
        await sendRunnerCallback(input.payload, {
            status: "completed",
            metadata: {
                notes: ["Cursor cloud runner completed ADD job execution."],
                cursorAgentId: createdRun.agentId,
                cursorRunId: createdRun.runId,
                cursorAgentUrl: createdRun.agentUrl,
                cursorModel,
                cursorRunStatus: cursorRun.status,
                cursorResult: cursorRun.result ?? null,
                cursorDurationMs: cursorRun.durationMs ?? null,
                commitSha,
                pushedBranch: matchedBranch?.branch ?? null,
                pushedPrUrl: matchedBranch?.prUrl ?? null,
                durationMs: Date.now() - input.startedAt,
                executionMode: input.executionMode
            }
        })

        return {
            ok: true,
            commitSha: commitSha ?? undefined,
            runId: createdRun.runId
        }
    }

    await sendRunnerCallback(input.payload, {
        status: "failed",
        errorMessage: `Cursor run ended with status ${cursorRun.status ?? "unknown"}.`,
        metadata: {
            notes: ["Cursor cloud runner did not finish successfully."],
            cursorAgentId: createdRun.agentId,
            cursorRunId: createdRun.runId,
            cursorAgentUrl: createdRun.agentUrl,
            cursorModel,
            cursorRunStatus: cursorRun.status ?? null,
            cursorResult: cursorRun.result ?? null,
            cursorDurationMs: cursorRun.durationMs ?? null,
            commitSha,
            pushedBranch: matchedBranch?.branch ?? null,
            pushedPrUrl: matchedBranch?.prUrl ?? null,
            durationMs: Date.now() - input.startedAt,
            executionMode: input.executionMode
        }
    })

    return { ok: false }
}

export const addExecuteJobTask = task({
    id: "add-execute-job",

    run: async (payload: AddExecutePayload) => {
        const startedAt = Date.now()

        await sendRunnerCallback(payload, {
            status: "running",
            metadata: {
                notes: ["Trigger task started."]
            }
        })

        if (!isAllowedRepository(payload.repository)) {
            await sendRunnerCallback(payload, {
                status: "blocked",
                errorMessage: `Repository is outside allowed scope: ${payload.repository}.`,
                metadata: {
                    notes: [
                        "Set ADD_ALLOWED_GITHUB_REPOSITORY to match the target repo."
                    ]
                }
            })

            return { ok: false }
        }

        if (!isAllowedBranch(payload.branchName)) {
            await sendRunnerCallback(payload, {
                status: "blocked",
                errorMessage: `Branch is outside allowed scope: ${payload.branchName}.`,
                metadata: {
                    notes: ["Branch must be main or job-*."]
                }
            })

            return { ok: false }
        }

        const executionMode = getExecutionMode(payload)

        if (executionMode === "noop") {
            await sendRunnerCallback(payload, {
                status: "completed",
                metadata: {
                    notes: [
                        "Trigger task completed in no-op mode.",
                        "Set ADD_TRIGGER_EXECUTION_MODE=repo-write for repository execution."
                    ],
                    durationMs: Date.now() - startedAt,
                    costUsd: 0
                }
            })

            return { ok: true }
        }

        if (!isSupportedExecutionMode(executionMode)) {
            await sendRunnerCallback(payload, {
                status: "blocked",
                errorMessage: `Unsupported execution mode: ${executionMode}.`,
                metadata: {
                    notes: [
                        "Use ADD_TRIGGER_EXECUTION_MODE=noop, repo-write, or cursor-cloud."
                    ]
                }
            })

            return { ok: false }
        }

        const token = payload.githubToken?.trim() || getGitHubRunnerToken()
        if (!token) {
            await sendRunnerCallback(payload, {
                status: "blocked",
                errorMessage: "Missing ADD_RUNNER_GITHUB_TOKEN.",
                metadata: {
                    notes: [
                        "Set ADD_RUNNER_GITHUB_TOKEN in Trigger.dev environment for repository execution."
                    ]
                }
            })

            return { ok: false }
        }

        try {
            await ensureBranchExists({
                repository: payload.repository,
                branchName: payload.branchName,
                syncFrom: payload.syncFrom,
                token
            })

            if (executionMode === "cursor-cloud")
                return await executeCursorCloudMode({
                    payload,
                    token,
                    startedAt,
                    executionMode
                })

            return await executeRepoWriteMode({
                payload,
                token,
                startedAt,
                executionMode
            })
        } catch (error) {
            await sendRunnerCallback(payload, {
                status: "failed",
                errorMessage:
                    error instanceof Error
                        ? error.message
                        : "Runner execution failed.",
                metadata: {
                    notes: ["Repository execution failed in Trigger task."],
                    durationMs: Date.now() - startedAt,
                    executionMode
                }
            })

            return { ok: false }
        }
    }
})
