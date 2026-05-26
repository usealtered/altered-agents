import { getAddJobById } from "./get"
import { updateAddJobStatus } from "./update"

type AddJobReportStatus =
    | "running"
    | "completed"
    | "failed"
    | "blocked"
    | "cancelled"

async function reportAddJobUpdate(input: {
    jobId: string
    status: AddJobReportStatus
    errorMessage?: string
    metadata?: Record<string, unknown>
}) {
    const job = await getAddJobById(input.jobId)
    if (!job) throw new Error(`ADD job not found: ${input.jobId}`)

    const isTerminal = ["completed", "failed", "blocked", "cancelled"].includes(
        input.status
    )

    return updateAddJobStatus({
        id: job.id,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        metadata: input.metadata,
        startedAt: input.status === "running" ? new Date() : undefined,
        completedAt: isTerminal ? new Date() : undefined
    })
}

export { type AddJobReportStatus, reportAddJobUpdate }
