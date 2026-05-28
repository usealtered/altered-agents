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

function toBase64(value: string): string {
    return Buffer.from(value, "utf8").toString("base64")
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

        const executionMode =
            payload.executionMode?.trim() ||
            process.env.ADD_TRIGGER_EXECUTION_MODE?.trim() ||
            "noop"

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

        if (executionMode !== "repo-write") {
            await sendRunnerCallback(payload, {
                status: "blocked",
                errorMessage: `Unsupported execution mode: ${executionMode}.`,
                metadata: {
                    notes: [
                        "Use ADD_TRIGGER_EXECUTION_MODE=noop or ADD_TRIGGER_EXECUTION_MODE=repo-write."
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

            const commitSha = await commitRunArtifact({ payload, token })

            await sendRunnerCallback(payload, {
                status: "completed",
                metadata: {
                    notes: [
                        "Runner committed ADD execution artifact to repository branch."
                    ],
                    commitSha,
                    durationMs: Date.now() - startedAt,
                    executionMode
                }
            })

            return { ok: true, commitSha }
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
