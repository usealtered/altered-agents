import { ensureAllowedBranch, ensureAllowedRepository } from "./scope-guards"
import type { AddRunner } from "./types"

type CursorCreateResponse = {
    agent?: { id?: string; url?: string }
    run?: { id?: string }
}

type GitHubRefResponse = {
    object?: {
        sha?: string
    }
}

type RunnerContext = {
    repository: string
    apiKey: string
    model: string
    githubToken: string
}

function getRunnerContext(input: {
    branchName: string
}): { ok: true; value: RunnerContext } | { ok: false; notes: string[] } {
    const repository = process.env.ADD_TARGET_GITHUB_REPOSITORY?.trim()
    if (!repository)
        return {
            ok: false,
            notes: ["Missing ADD_TARGET_GITHUB_REPOSITORY for ADD execution."]
        }

    const branchGuard = ensureAllowedBranch(input.branchName)
    if (!branchGuard.ok) return { ok: false, notes: [branchGuard.reason] }

    const repositoryGuard = ensureAllowedRepository(repository)
    if (!repositoryGuard.ok)
        return { ok: false, notes: [repositoryGuard.reason] }

    const apiKey =
        process.env.ADD_CURSOR_API_KEY?.trim() ||
        process.env.CURSOR_API_KEY?.trim()
    if (!apiKey)
        return {
            ok: false,
            notes: ["Missing ADD_CURSOR_API_KEY (or CURSOR_API_KEY)."]
        }

    const githubToken = process.env.ADD_RUNNER_GITHUB_TOKEN?.trim()
    if (!githubToken)
        return {
            ok: false,
            notes: ["Missing ADD_RUNNER_GITHUB_TOKEN for branch provisioning."]
        }

    return {
        ok: true,
        value: {
            repository,
            apiKey,
            model: process.env.ADD_CURSOR_MODEL?.trim() || "composer-2.5",
            githubToken
        }
    }
}

function buildPrompt(input: {
    jobId: string
    branchName: string
    request: string
    summaryBullets: string[]
}): string {
    return [
        `Job ${input.jobId} on branch ${input.branchName}.`,
        `Request: ${input.request}`,
        ...input.summaryBullets.map(bullet => `- ${bullet}`),
        "Implement this in the repo, run pnpm check, commit, and push."
    ].join("\n")
}

function buildAuthToken(apiKey: string): string {
    return Buffer.from(`${apiKey}:`, "utf8").toString("base64")
}

async function createCursorRun(input: {
    authToken: string
    repository: string
    model: string
    branchName: string
    prompt: string
}): Promise<
    | {
          ok: true
          value: { agentId: string; runId: string; agentUrl: string | null }
      }
    | { ok: false; notes: string[] }
> {
    const response = await fetch("https://api.cursor.com/v1/agents", {
        method: "POST",
        headers: {
            authorization: `Basic ${input.authToken}`,
            "content-type": "application/json",
            accept: "application/json"
        },
        body: JSON.stringify({
            prompt: { text: input.prompt },
            model: { id: input.model },
            repos: [
                {
                    url: `https://github.com/${input.repository}`,
                    startingRef: input.branchName
                }
            ],
            workOnCurrentBranch: true,
            autoCreatePR: false,
            skipReviewerRequest: true
        })
    })

    const payload = (await response.json()) as CursorCreateResponse
    if (!response.ok)
        return {
            ok: false,
            notes: [
                `Cursor create failed (${response.status}).`,
                JSON.stringify(payload)
            ]
        }

    const agentId = payload.agent?.id
    const runId = payload.run?.id
    if (!agentId || !runId)
        return { ok: false, notes: ["Cursor response missing agent/run IDs."] }

    return {
        ok: true,
        value: {
            agentId,
            runId,
            agentUrl: payload.agent?.url ?? null
        }
    }
}

async function callGitHub<T>(input: {
    method: "GET" | "POST"
    path: string
    token: string
    body?: Record<string, unknown>
}): Promise<{ status: number; json: T | null }> {
    const response = await fetch(`https://api.github.com${input.path}`, {
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

async function ensureTargetBranchExists(input: {
    repository: string
    branchName: string
    token: string
}) {
    const existing = await getRefSha({
        repository: input.repository,
        ref: input.branchName,
        token: input.token
    })
    if (existing) return

    const baseSha = await getRefSha({
        repository: input.repository,
        ref: "main",
        token: input.token
    })
    if (!baseSha) throw new Error("Failed to resolve main branch SHA.")

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

const cursorDirectRunner: AddRunner = {
    async execute(input) {
        const context = getRunnerContext({ branchName: input.branchName })
        if (!context.ok) return { status: "blocked", notes: context.notes }

        try {
            await ensureTargetBranchExists({
                repository: context.value.repository,
                branchName: input.branchName,
                token: context.value.githubToken
            })

            const authToken = buildAuthToken(context.value.apiKey)
            const createRun = await createCursorRun({
                authToken,
                repository: context.value.repository,
                model: context.value.model,
                branchName: input.branchName,
                prompt: buildPrompt({
                    jobId: input.jobId,
                    branchName: input.branchName,
                    request: input.request,
                    summaryBullets: input.summaryBullets
                })
            })

            if (!createRun.ok)
                return { status: "failed", notes: createRun.notes }

            return {
                status: "running",
                notes: ["Cursor cloud run created for ADD job execution."],
                metadata: {
                    executionMode: "cursor-cloud",
                    cursorAgentId: createRun.value.agentId,
                    cursorRunId: createRun.value.runId,
                    cursorAgentUrl: createRun.value.agentUrl,
                    cursorModel: context.value.model
                }
            }
        } catch (error) {
            return {
                status: "failed",
                notes: [
                    "Cursor direct runner failed.",
                    error instanceof Error ? error.message : String(error)
                ]
            }
        }
    }
}

export { cursorDirectRunner }
