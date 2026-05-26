import {
    ensureAllowedBranch,
    ensureAllowedRepository,
    ensureAllowedRunnerUrl
} from "./scope-guards"
import type { AddRunner, AddRunnerExecutionInput } from "./types"

const DEFAULT_TIMEOUT_MS = 90_000

function getCursorRunnerWebhookUrl(): string | undefined {
    return process.env.ADD_CURSOR_RUNNER_WEBHOOK_URL?.trim() || undefined
}

function getRequestHeaders(): HeadersInit {
    const token = process.env.ADD_CURSOR_RUNNER_TOKEN?.trim()

    if (!token) return { "content-type": "application/json" }

    return {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
    }
}

const cursorWebhookRunner: AddRunner = {
    async execute(input: AddRunnerExecutionInput) {
        const url = getCursorRunnerWebhookUrl()

        if (!url)
            return {
                status: "blocked",
                notes: [
                    "No cursor runner webhook URL is configured.",
                    "Set ADD_CURSOR_RUNNER_WEBHOOK_URL to enable remote execution."
                ]
            }

        const branchGuard = ensureAllowedBranch(input.branchName)
        if (!branchGuard.ok)
            return {
                status: "blocked",
                notes: [branchGuard.reason]
            }

        const repository = process.env.ADD_TARGET_GITHUB_REPOSITORY?.trim()
        if (!repository)
            return {
                status: "blocked",
                notes: [
                    "Missing ADD_TARGET_GITHUB_REPOSITORY for runner execution."
                ]
            }

        const repositoryGuard = ensureAllowedRepository(repository)
        if (!repositoryGuard.ok)
            return {
                status: "blocked",
                notes: [repositoryGuard.reason]
            }

        const urlGuard = ensureAllowedRunnerUrl(url)
        if (!urlGuard.ok)
            return {
                status: "blocked",
                notes: [urlGuard.reason]
            }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    ...input,
                    repository,
                    syncFrom: "main"
                }),
                signal: controller.signal
            })

            if (!response.ok)
                return {
                    status: "failed",
                    notes: [
                        `Runner webhook returned ${response.status}.`,
                        "Execution did not start successfully."
                    ],
                    metadata: {
                        status: response.status,
                        statusText: response.statusText
                    }
                }

            const payload = (await response.json()) as
                | {
                      status?: "completed" | "blocked" | "failed"
                      notes?: string[]
                      metadata?: Record<string, unknown>
                  }
                | undefined

            return {
                status: payload?.status ?? "completed",
                notes: payload?.notes ?? ["Runner accepted the job."],
                metadata: payload?.metadata
            }
        } catch (error) {
            return {
                status: "failed",
                notes: ["Runner request failed before completion."],
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error)
                }
            }
        } finally {
            clearTimeout(timeout)
        }
    }
}

export { cursorWebhookRunner }
