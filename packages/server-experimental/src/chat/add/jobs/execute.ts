import { getAddPlanById } from "../plans/get"
import { isLocalRunnerEnabled, localTestRunner } from "../runner/local-test"
import { triggerClientRunner } from "../runner/trigger-client"
import { getAddJobById } from "./get"
import { updateAddJobStatus } from "./update"

async function executeAddJob(jobId: string): Promise<void> {
    const job = await getAddJobById(jobId)
    if (!job) throw new Error(`ADD job was not found: ${jobId}`)

    if (job.status !== "queued" && job.status !== "running") return

    const plan = await getAddPlanById(job.planId)
    if (!plan) throw new Error(`ADD plan was not found for job: ${jobId}`)

    await updateAddJobStatus({
        id: jobId,
        status: "running",
        startedAt: new Date()
    })

    const activeRunner = isLocalRunnerEnabled()
        ? localTestRunner
        : triggerClientRunner

    const result = await activeRunner.execute({
        jobId: job.id,
        planId: plan.id,
        request: plan.request,
        summaryBullets: plan.summaryBullets,
        detailBullets: plan.detailBullets,
        branchName: job.branchName
    })

    if (result.status === "completed") {
        await updateAddJobStatus({
            id: jobId,
            status: "completed",
            metadata: {
                ...(result.metadata ?? {}),
                notes: result.notes
            },
            completedAt: new Date()
        })

        return
    }

    if (result.status === "running") {
        await updateAddJobStatus({
            id: jobId,
            status: "running",
            metadata: {
                ...(result.metadata ?? {}),
                notes: result.notes
            }
        })

        return
    }

    if (result.status === "blocked") {
        await updateAddJobStatus({
            id: jobId,
            status: "blocked",
            errorMessage: result.notes.join(" "),
            metadata: {
                ...(result.metadata ?? {}),
                notes: result.notes
            },
            completedAt: new Date()
        })

        return
    }

    await updateAddJobStatus({
        id: jobId,
        status: "failed",
        errorMessage: result.notes.join(" "),
        metadata: {
            ...(result.metadata ?? {}),
            notes: result.notes
        },
        completedAt: new Date()
    })
}

export { executeAddJob }
