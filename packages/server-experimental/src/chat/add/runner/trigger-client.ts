import { ensureAllowedBranch, ensureAllowedRepository } from "./scope-guards"
import type { AddRunner, AddRunnerExecutionInput } from "./types"

type TriggerTaskResponse = {
    id?: string
}

function getTriggerBaseUrl(): string {
    return (
        process.env.ADD_TRIGGER_API_BASE_URL?.trim() ||
        "https://api.trigger.dev"
    )
}

function getTriggerTaskId(): string | undefined {
    return process.env.ADD_TRIGGER_TASK_ID?.trim()
}

function getTriggerSecretKey(): string | undefined {
    return (
        process.env.TRIGGER_SECRET_KEY?.trim() ||
        process.env.ADD_TRIGGER_SECRET_KEY?.trim()
    )
}

function getRunnerCallbackUrl(): string | undefined {
    return process.env.ADD_RUNNER_CALLBACK_URL?.trim()
}

function getRunnerCallbackSecret(): string | undefined {
    return process.env.ADD_RUNNER_CALLBACK_SECRET?.trim()
}

function getExecutionMode(): string | undefined {
    return process.env.ADD_TRIGGER_EXECUTION_MODE?.trim()
}

function getRunnerGitHubToken(): string | undefined {
    return process.env.ADD_RUNNER_GITHUB_TOKEN?.trim()
}

const triggerClientRunner: AddRunner = {
    async execute(input: AddRunnerExecutionInput) {
        const taskId = getTriggerTaskId()
        if (!taskId)
            return {
                status: "blocked",
                notes: [
                    "Missing ADD_TRIGGER_TASK_ID.",
                    "Set the Trigger.dev task identifier for ADD execution."
                ]
            }

        const triggerSecretKey = getTriggerSecretKey()
        if (!triggerSecretKey)
            return {
                status: "blocked",
                notes: [
                    "Missing TRIGGER_SECRET_KEY (or ADD_TRIGGER_SECRET_KEY).",
                    "Set your Trigger.dev secret key for API-triggered runs."
                ]
            }

        const callbackUrl = getRunnerCallbackUrl()
        const callbackSecret = getRunnerCallbackSecret()
        if (!callbackUrl || !callbackSecret)
            return {
                status: "blocked",
                notes: [
                    "Missing callback configuration.",
                    "Set ADD_RUNNER_CALLBACK_URL and ADD_RUNNER_CALLBACK_SECRET."
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
                    "Missing ADD_TARGET_GITHUB_REPOSITORY for ADD execution."
                ]
            }

        const repositoryGuard = ensureAllowedRepository(repository)
        if (!repositoryGuard.ok)
            return {
                status: "blocked",
                notes: [repositoryGuard.reason]
            }

        try {
            const response = await fetch(
                `${getTriggerBaseUrl()}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        authorization: `Bearer ${triggerSecretKey}`
                    },
                    body: JSON.stringify({
                        payload: {
                            ...input,
                            repository,
                            syncFrom: "main",
                            callbackUrl,
                            callbackSecret,
                            executionMode: getExecutionMode(),
                            githubToken: getRunnerGitHubToken()
                        },
                        options: {
                            idempotencyKey: `add-job-${input.jobId}`,
                            tags: ["add", "agents"]
                        }
                    })
                }
            )

            if (!response.ok)
                return {
                    status: "failed",
                    notes: [
                        `Trigger.dev returned ${response.status}.`,
                        "Failed to enqueue ADD runner task."
                    ],
                    metadata: {
                        status: response.status,
                        statusText: response.statusText
                    }
                }

            const payload = (await response.json()) as TriggerTaskResponse

            return {
                status: "running",
                notes: ["Trigger.dev task accepted.", `Task: ${taskId}`],
                metadata: {
                    triggerTaskId: taskId,
                    triggerRunId: payload.id ?? null
                }
            }
        } catch (error) {
            return {
                status: "failed",
                notes: ["Failed to call Trigger.dev API."],
                metadata: {
                    error:
                        error instanceof Error ? error.message : String(error)
                }
            }
        }
    }
}

export { triggerClientRunner }
