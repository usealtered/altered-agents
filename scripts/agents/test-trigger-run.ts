import { getEnvironmentConfig } from "../../packages/core-experimental/src/config/environment"
import { loadAgentEnvironment } from "../../packages/core-experimental/src/config/load-env"
import { createAddJob } from "../../packages/server-experimental/src/chat/add/jobs/create"
import { executeAddJob } from "../../packages/server-experimental/src/chat/add/jobs/execute"
import { getAddJobById } from "../../packages/server-experimental/src/chat/add/jobs/get"
import { createAddPlan } from "../../packages/server-experimental/src/chat/add/plans/create"
import { reconcileAddJobCursorStatus } from "../../packages/server-experimental/src/chat/add/runner/cursor-status"
import { conversations } from "../../packages/server-experimental/src/chat/conversations/schema"
import { getDatabase } from "../../packages/server-experimental/src/storage/database/connection"

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = Number.parseInt(
    process.env.ADD_TEST_POLL_TIMEOUT_MS?.trim() || "420000",
    10
)

function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function getRequired(name: string): string {
    const value = process.env[name]?.trim()
    if (!value)
        throw new Error(`Missing required environment variable: ${name}.`)

    return value
}

async function main() {
    loadAgentEnvironment()

    const database = getDatabase()

    const [conversation] = await database
        .insert(conversations)
        .values({
            providerId: "sendblue",
            userId: null,
            brainId: null
        })
        .returning()

    if (!conversation) throw new Error("Failed to create test conversation.")

    const now = Date.now()
    const threadId = `e2e-trigger-${now}`

    const plan = await createAddPlan({
        threadId,
        conversationId: conversation.id,
        request: "E2E test run for ADD trigger execution",
        summaryBullets: [
            "Create branch",
            "Execute approved ADD plan",
            "Report callback"
        ],
        detailBullets: ["Validate Trigger execution mode behavior."]
    })

    const branchName = `job-e2e-${plan.id.slice(0, 8)}`

    const job = await createAddJob({
        planId: plan.id,
        branchName
    })

    getRequired("ADD_TRIGGER_TASK_ID")
    getRequired("ADD_RUNNER_CALLBACK_URL")
    getRequired("ADD_RUNNER_CALLBACK_SECRET")
    getRequired("ADD_TARGET_GITHUB_REPOSITORY")

    const {
        shared: { providers }
    } = getEnvironmentConfig()

    await executeAddJob(job.id)

    console.log(
        `Triggered ADD execution for ${job.id} (${providers.sendblue.number}).`
    )

    const startedAt = Date.now()

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await reconcileAddJobCursorStatus(job.id)

        const latest = await getAddJobById(job.id)
        if (!latest) throw new Error(`Test job disappeared: ${job.id}.`)

        if (
            latest.status === "completed" ||
            latest.status === "failed" ||
            latest.status === "blocked" ||
            latest.status === "cancelled"
        ) {
            console.log(JSON.stringify(latest, null, 2))
            return
        }

        await sleep(POLL_INTERVAL_MS)
    }

    const timedOut = await getAddJobById(job.id)
    console.log(JSON.stringify(timedOut, null, 2))
    throw new Error(`Timed out waiting for ADD job completion: ${job.id}.`)
}

void main()
