import { reportAddJobUpdate } from "./jobs/report"

type AddRunnerWebhookPayload = {
    jobId: string
    status: "running" | "completed" | "failed" | "blocked" | "cancelled"
    errorMessage?: string
    metadata?: Record<string, unknown>
}

function readBearerToken(request: Request): string | undefined {
    const authorization = request.headers.get("authorization")
    if (!authorization?.startsWith("Bearer ")) return

    return authorization.slice("Bearer ".length).trim()
}

function ensureRunnerWebhookAccess(request: Request) {
    const expectedToken = process.env.ADD_RUNNER_CALLBACK_SECRET?.trim()
    if (!expectedToken) throw new Error("Missing ADD_RUNNER_CALLBACK_SECRET.")

    const token = readBearerToken(request)
    if (!token || token !== expectedToken)
        throw new Error("Unauthorized runner callback.")
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function isRunnerStatus(
    value: unknown
): value is AddRunnerWebhookPayload["status"] {
    return (
        value === "running" ||
        value === "completed" ||
        value === "failed" ||
        value === "blocked" ||
        value === "cancelled"
    )
}

function parseRunnerWebhookPayload(
    value: unknown
): AddRunnerWebhookPayload | null {
    if (!isObject(value)) return null

    const jobId = value.jobId
    const status = value.status
    const errorMessage = value.errorMessage
    const metadata = value.metadata

    if (typeof jobId !== "string" || !isRunnerStatus(status)) return null

    if (errorMessage !== undefined && typeof errorMessage !== "string")
        return null

    if (metadata !== undefined && !isObject(metadata)) return null

    return {
        jobId,
        status,
        errorMessage,
        metadata
    }
}

async function processAddRunnerWebhook(request: Request): Promise<Response> {
    try {
        ensureRunnerWebhookAccess(request)

        const payload = parseRunnerWebhookPayload(await request.json())

        if (!payload)
            return new Response("Invalid runner payload.", { status: 400 })

        await reportAddJobUpdate(payload)

        return new Response("ok", { status: 200 })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error."

        const status = message.includes("Unauthorized") ? 401 : 500

        return new Response(message, { status })
    }
}

export { processAddRunnerWebhook }
