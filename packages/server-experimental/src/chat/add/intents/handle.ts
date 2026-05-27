import { createAddJob } from "../jobs/create"
import { executeAddJob } from "../jobs/execute"
import {
    getAddJobById,
    getLatestAddJobForThread,
    listRecentAddJobsForThread
} from "../jobs/get"
import { updateAddJobStatus } from "../jobs/update"
import { createAddPlan } from "../plans/create"
import { generateAddPlanBullets } from "../plans/generate-bullets"
import { getAddPlanById, getLatestAddPlanForThread } from "../plans/get"
import { saveAddPlanToRepository } from "../plans/save-to-repository"
import {
    updateAddPlanRepositoryPath,
    updateAddPlanStatus
} from "../plans/update-status"
import { parseAddIntent } from "./parse"

type HandleAddIntentInput = {
    messageText: string
    threadId: string
    conversationId: string
}

type AddIntentContext = {
    threadId: string
    conversationId: string
}

function formatPlanMessage(input: {
    planId: string
    summaryBullets: string[]
}): string {
    const lines = [
        `Plan created: ${input.planId}`,
        "",
        ...input.summaryBullets.map(
            (bullet, index) => `${index + 1}. ${bullet}`
        ),
        "",
        "Reply with natural language (for example: 'approve this plan').",
        "Fallback commands: /approve <planId>, /reject <planId>, /expand <planId>, /help."
    ]

    return lines.join("\n")
}

function formatHelpMessage(): string {
    return [
        "ADD controls:",
        "- Plan: 'make a plan for ...' or /plan <request>",
        "- Expand: 'expand this plan' or /expand <planId>",
        "- Approve: 'approve this plan' or /approve <planId>",
        "- Reject: 'reject this plan because ...' or /reject <planId>",
        "- Status: 'run status' or /run-status <jobId>",
        "- Stop: 'stop this job' or /stop <jobId>",
        "- Cost: 'show cost' or /cost",
        "- Health: 'health' or /health"
    ].join("\n")
}

function buildJobBranchName(jobId: string): string {
    return `job-${jobId.slice(0, 8)}`
}

function formatJobStatusMessage(input: {
    id: string
    status: string
    branchName: string
    errorMessage?: string | null
}): string {
    return [
        `Job: ${input.id}`,
        `Status: ${input.status}`,
        `Branch: ${input.branchName}`,
        input.errorMessage ? `Details: ${input.errorMessage}` : ""
    ]
        .filter(Boolean)
        .join("\n")
}

async function persistPlanFileIfAvailable(input: {
    planId: string
    request: string
    summaryBullets: string[]
    detailBullets: string[]
}) {
    try {
        const repositoryPlanPath = await saveAddPlanToRepository(input)

        await updateAddPlanRepositoryPath(input.planId, repositoryPlanPath)
    } catch {
        //  We keep the workflow alive even if local plan-file persistence is unavailable in runtime.
    }
}

function resolvePlanForThread(input: {
    threadId: string
    planId?: string
    pendingOnly?: boolean
}) {
    if (input.planId) return getAddPlanById(input.planId)

    if (input.pendingOnly)
        return getLatestAddPlanForThread(input.threadId, ["pending_approval"])

    return getLatestAddPlanForThread(input.threadId)
}

function resolveJobForThread(input: { threadId: string; jobId?: string }) {
    if (input.jobId) return getAddJobById(input.jobId)

    return getLatestAddJobForThread(input.threadId)
}

async function handlePlanIntent(
    request: string,
    context: AddIntentContext
): Promise<string> {
    const { summaryBullets, detailBullets } =
        await generateAddPlanBullets(request)

    const createdPlan = await createAddPlan({
        threadId: context.threadId,
        conversationId: context.conversationId,
        request,
        summaryBullets,
        detailBullets
    })

    await persistPlanFileIfAvailable({
        planId: createdPlan.id,
        request,
        summaryBullets,
        detailBullets
    })

    return formatPlanMessage({
        planId: createdPlan.id,
        summaryBullets: createdPlan.summaryBullets
    })
}

async function handleExpandIntent(
    context: AddIntentContext,
    planId?: string
): Promise<string> {
    const plan = await resolvePlanForThread({
        threadId: context.threadId,
        planId
    })

    if (!plan) return "No plan was found for this thread."

    return [
        `Expanded plan: ${plan.id}`,
        "",
        ...plan.detailBullets.map(
            (bullet: string, index: number) => `${index + 1}. ${bullet}`
        )
    ].join("\n")
}

async function handleApproveIntent(
    context: AddIntentContext,
    planId?: string
): Promise<string> {
    const plan = await resolvePlanForThread({
        threadId: context.threadId,
        planId,
        pendingOnly: true
    })

    if (!plan) return "No pending plan found to approve."

    const approvedPlan = await updateAddPlanStatus(plan.id, "approved")
    const createdJob = await createAddJob({
        planId: approvedPlan.id,
        branchName: buildJobBranchName(approvedPlan.id)
    })

    void executeAddJob(createdJob.id)

    return [
        `Plan approved: ${approvedPlan.id}`,
        `Job queued: ${createdJob.id}`,
        `Branch target: ${createdJob.branchName}`
    ].join("\n")
}

async function handleRejectIntent(
    context: AddIntentContext,
    input: { planId?: string; reason?: string }
): Promise<string> {
    const plan = await resolvePlanForThread({
        threadId: context.threadId,
        planId: input.planId,
        pendingOnly: true
    })

    if (!plan) return "No pending plan found to reject."

    await updateAddPlanStatus(plan.id, "rejected")

    return [
        `Plan rejected: ${plan.id}`,
        input.reason ? `Reason: ${input.reason}` : ""
    ]
        .filter(Boolean)
        .join("\n")
}

async function handleStatusIntent(
    context: AddIntentContext,
    jobId?: string
): Promise<string> {
    const job = await resolveJobForThread({ threadId: context.threadId, jobId })

    if (!job) return "No job found for this thread."

    return formatJobStatusMessage(job)
}

async function handleStopIntent(
    context: AddIntentContext,
    jobId?: string
): Promise<string> {
    const job = await resolveJobForThread({ threadId: context.threadId, jobId })

    if (!job) return "No running or queued job found to stop."

    if (!["queued", "running", "blocked"].includes(job.status))
        return "This job is already finished."

    await updateAddJobStatus({
        id: job.id,
        status: "cancelled",
        errorMessage: "Cancelled by user request.",
        completedAt: new Date()
    })

    return `Job cancelled: ${job.id}`
}

async function handleCostIntent(context: AddIntentContext): Promise<string> {
    const recentJobs = await listRecentAddJobsForThread(context.threadId, 20)

    const totalCost = recentJobs.reduce((accumulator, job) => {
        const metadata = job.metadata as { costUsd?: number } | null
        const cost = metadata?.costUsd

        if (typeof cost !== "number") return accumulator

        return accumulator + cost
    }, 0)

    const jobsWithCost = recentJobs.filter(job => {
        const metadata = job.metadata as { costUsd?: number } | null

        return typeof metadata?.costUsd === "number"
    }).length

    if (jobsWithCost === 0)
        return [
            "No cost payload has been reported yet.",
            "Runner callbacks can include metadata.costUsd for rollups."
        ].join("\n")

    return [
        `Jobs with cost data: ${jobsWithCost}`,
        `Total reported cost: $${totalCost.toFixed(4)}`
    ].join("\n")
}

function handleHealthIntent(): string {
    const mode =
        process.env.ADD_USE_LOCAL_TEST_RUNNER === "1"
            ? "local-test"
            : "trigger-dev"

    return [
        "ADD health:",
        `- runner mode: ${mode}`,
        `- target repo: ${process.env.ADD_TARGET_GITHUB_REPOSITORY ?? "unset"}`,
        `- trigger task id configured: ${process.env.ADD_TRIGGER_TASK_ID ? "yes" : "no"}`,
        `- trigger key configured: ${process.env.TRIGGER_SECRET_KEY || process.env.ADD_TRIGGER_SECRET_KEY ? "yes" : "no"}`,
        `- callback URL configured: ${process.env.ADD_RUNNER_CALLBACK_URL ? "yes" : "no"}`,
        `- callback secret configured: ${process.env.ADD_RUNNER_CALLBACK_SECRET ? "yes" : "no"}`
    ].join("\n")
}

async function handleAddIntent(
    input: HandleAddIntentInput
): Promise<string | null> {
    const intent = parseAddIntent(input.messageText)
    if (intent.kind === "none") return null
    if (intent.kind === "help") return formatHelpMessage()

    const context: AddIntentContext = {
        threadId: input.threadId,
        conversationId: input.conversationId
    }

    if (intent.kind === "plan")
        return await handlePlanIntent(intent.request, context)
    if (intent.kind === "expand")
        return await handleExpandIntent(context, intent.planId)
    if (intent.kind === "approve")
        return await handleApproveIntent(context, intent.planId)
    if (intent.kind === "reject")
        return await handleRejectIntent(context, {
            planId: intent.planId,
            reason: intent.reason
        })
    if (intent.kind === "status")
        return await handleStatusIntent(context, intent.jobId)
    if (intent.kind === "stop")
        return await handleStopIntent(context, intent.jobId)
    if (intent.kind === "cost") return await handleCostIntent(context)
    if (intent.kind === "health") return handleHealthIntent()

    return null
}

export { handleAddIntent }
