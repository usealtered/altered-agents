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

        //  This is a deployable baseline runner so end-to-end ADD flow can be validated.
        await sendRunnerCallback(payload, {
            status: "completed",
            metadata: {
                notes: [
                    "Trigger task completed in no-op baseline mode.",
                    "Implement execution backend inside this task to apply repository changes."
                ],
                durationMs: Date.now() - startedAt,
                costUsd: 0
            }
        })

        return { ok: true }
    }
})
