import { getAddJobById, getLatestAddJobForThread } from "../jobs/get"
import { updateAddJobStatus } from "../jobs/update"

type CursorRunResponse = {
    status?: string
    result?: string
    durationMs?: number
    git?: {
        branches?: Array<{ branch?: string; prUrl?: string }>
    }
}

type CursorJobMetadata = {
    executionMode?: string
    cursorAgentId?: string
    cursorRunId?: string
    cursorAgentUrl?: string
    cursorModel?: string
    cursorRunStatus?: string
    cursorResult?: string
    cursorDurationMs?: number
    pushedBranch?: string
    pushedPrUrl?: string
    commitSha?: string
    notes?: string[]
}

function getCursorApiKey(): string | undefined {
    return (
        process.env.ADD_CURSOR_API_KEY?.trim() ||
        process.env.CURSOR_API_KEY?.trim()
    )
}

function getGitHubToken(): string | undefined {
    return process.env.ADD_RUNNER_GITHUB_TOKEN?.trim()
}

function getTargetRepository(): string | undefined {
    return process.env.ADD_TARGET_GITHUB_REPOSITORY?.trim()
}

function readCursorMetadata(metadata: unknown): CursorJobMetadata {
    if (!metadata || typeof metadata !== "object") return {}

    return metadata as CursorJobMetadata
}

function buildCursorAuthHeader(apiKey: string): string {
    const token = Buffer.from(`${apiKey}:`, "utf8").toString("base64")

    return `Basic ${token}`
}

async function fetchCursorRun(input: {
    agentId: string
    runId: string
    apiKey: string
}): Promise<CursorRunResponse | null> {
    const response = await fetch(
        `https://api.cursor.com/v1/agents/${encodeURIComponent(input.agentId)}/runs/${encodeURIComponent(input.runId)}`,
        {
            headers: {
                authorization: buildCursorAuthHeader(input.apiKey),
                accept: "application/json"
            }
        }
    )

    if (!response.ok) return null

    return (await response.json()) as CursorRunResponse
}

async function getBranchHeadSha(input: {
    repository: string
    branchName: string
    token: string
}): Promise<string | null> {
    const response = await fetch(
        `https://api.github.com/repos/${input.repository}/git/ref/heads/${encodeURIComponent(input.branchName)}`,
        {
            headers: {
                authorization: `Bearer ${input.token}`,
                accept: "application/vnd.github+json",
                "x-github-api-version": "2022-11-28"
            }
        }
    )

    if (!response.ok) return null

    const payload = (await response.json()) as {
        object?: { sha?: string }
    }

    return payload.object?.sha ?? null
}

function findBranchMetadata(input: {
    run: CursorRunResponse
    branchName: string
}): { branch: string | null; prUrl: string | null } {
    const branch =
        input.run.git?.branches?.find(
            item => item.branch === input.branchName
        ) ?? input.run.git?.branches?.[0]

    return {
        branch: branch?.branch ?? null,
        prUrl: branch?.prUrl ?? null
    }
}

async function reconcileAddJobCursorStatus(jobId: string) {
    const job = await getAddJobById(jobId)
    if (!job) return null
    if (job.status !== "running") return job

    const metadata = readCursorMetadata(job.metadata)
    if (metadata.executionMode !== "cursor-cloud") return job

    const agentId = metadata.cursorAgentId
    const runId = metadata.cursorRunId
    if (!agentId || !runId) return job

    const cursorApiKey = getCursorApiKey()
    if (!cursorApiKey) return job

    const run = await fetchCursorRun({
        agentId,
        runId,
        apiKey: cursorApiKey
    })
    if (!run?.status) return job

    const branch = findBranchMetadata({ run, branchName: job.branchName })

    if (run.status === "FINISHED")
        return await completeCursorJob({
            jobId: job.id,
            branchName: job.branchName,
            metadata,
            run,
            branch
        })

    if (run.status === "ERROR" || run.status === "EXPIRED")
        return await failCursorJob({
            jobId: job.id,
            metadata,
            run,
            branch
        })

    if (run.status === "CANCELLED")
        return await cancelCursorJob({
            jobId: job.id,
            metadata,
            run,
            branch
        })

    return job
}

async function completeCursorJob(input: {
    jobId: string
    branchName: string
    metadata: CursorJobMetadata
    run: CursorRunResponse
    branch: { branch: string | null; prUrl: string | null }
}) {
    const repository = getTargetRepository()
    const githubToken = getGitHubToken()
    const commitSha =
        repository && githubToken
            ? await getBranchHeadSha({
                  repository,
                  branchName: input.branchName,
                  token: githubToken
              })
            : null

    return await updateAddJobStatus({
        id: input.jobId,
        status: "completed",
        metadata: {
            ...input.metadata,
            notes: ["Cursor cloud runner completed ADD job execution."],
            cursorRunStatus: input.run.status,
            cursorResult: input.run.result ?? null,
            cursorDurationMs: input.run.durationMs ?? null,
            commitSha,
            pushedBranch: input.branch.branch,
            pushedPrUrl: input.branch.prUrl
        },
        completedAt: new Date()
    })
}

async function failCursorJob(input: {
    jobId: string
    metadata: CursorJobMetadata
    run: CursorRunResponse
    branch: { branch: string | null; prUrl: string | null }
}) {
    return await updateAddJobStatus({
        id: input.jobId,
        status: "failed",
        errorMessage:
            input.run.result ??
            `Cursor run ended with terminal status ${input.run.status}.`,
        metadata: {
            ...input.metadata,
            notes: ["Cursor cloud runner failed."],
            cursorRunStatus: input.run.status,
            cursorResult: input.run.result ?? null,
            cursorDurationMs: input.run.durationMs ?? null,
            pushedBranch: input.branch.branch,
            pushedPrUrl: input.branch.prUrl
        },
        completedAt: new Date()
    })
}

async function cancelCursorJob(input: {
    jobId: string
    metadata: CursorJobMetadata
    run: CursorRunResponse
    branch: { branch: string | null; prUrl: string | null }
}) {
    return await updateAddJobStatus({
        id: input.jobId,
        status: "cancelled",
        errorMessage: input.run.result ?? "Cursor run was cancelled.",
        metadata: {
            ...input.metadata,
            notes: ["Cursor cloud runner was cancelled."],
            cursorRunStatus: input.run.status,
            cursorResult: input.run.result ?? null,
            cursorDurationMs: input.run.durationMs ?? null,
            pushedBranch: input.branch.branch,
            pushedPrUrl: input.branch.prUrl
        },
        completedAt: new Date()
    })
}

async function reconcileLatestRunningAddJobForThread(threadId: string) {
    const latest = await getLatestAddJobForThread(threadId)
    if (!latest || latest.status !== "running") return latest

    return await reconcileAddJobCursorStatus(latest.id)
}

export { reconcileAddJobCursorStatus, reconcileLatestRunningAddJobForThread }
