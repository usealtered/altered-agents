import { loadAgentEnvironment } from "../../packages/core-experimental/src/config/load-env"
import {
    getAddJobById,
    getLatestAddJobForThread
} from "../../packages/server-experimental/src/chat/add/jobs/get"

function getArgument(name: "--job" | "--thread"): string | undefined {
    const index = process.argv.indexOf(name)
    if (index < 0) return

    return process.argv[index + 1]?.trim()
}

async function main() {
    loadAgentEnvironment()

    const jobId = getArgument("--job")
    const threadId = getArgument("--thread")

    if (!jobId && !threadId)
        throw new Error("Pass --job <jobId> or --thread <threadId>.")

    const job = jobId
        ? await getAddJobById(jobId)
        : await getLatestAddJobForThread(threadId ?? "")

    if (!job)
        throw new Error(
            jobId
                ? `Job not found: ${jobId}.`
                : `No jobs found for thread: ${threadId}.`
        )

    const metadata =
        job.metadata && typeof job.metadata === "object"
            ? (job.metadata as Record<string, unknown>)
            : null

    const output = {
        id: job.id,
        planId: job.planId,
        status: job.status,
        branchName: job.branchName,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        durationMs:
            job.startedAt && job.completedAt
                ? new Date(job.completedAt).getTime() -
                  new Date(job.startedAt).getTime()
                : null,
        cursorAgentUrl: metadata?.cursorAgentUrl ?? null,
        cursorRunStatus: metadata?.cursorRunStatus ?? null,
        commitSha: metadata?.commitSha ?? null,
        notes: metadata?.notes ?? null,
        metadata
    }

    console.log(JSON.stringify(output, null, 2))
}

void main()
