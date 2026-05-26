type AddRunnerExecutionInput = {
    jobId: string
    planId: string
    request: string
    summaryBullets: string[]
    detailBullets: string[]
    branchName: string
}

type AddRunnerExecutionResult = {
    status: "running" | "completed" | "blocked" | "failed"
    notes: string[]
    metadata?: Record<string, unknown>
}

type AddRunner = {
    execute(input: AddRunnerExecutionInput): Promise<AddRunnerExecutionResult>
}

export type { AddRunner, AddRunnerExecutionInput, AddRunnerExecutionResult }
