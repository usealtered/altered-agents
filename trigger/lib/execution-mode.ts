type AddExecutionMode = "noop" | "repo-write"

type ExecutionModeOutcome =
    | { kind: "noop" }
    | { kind: "repo-write" }
    | { kind: "unsupported"; mode: string }

/**
 * Resolves the ADD trigger execution mode from payload and environment inputs.
 *
 * @remarks
 * Payload mode takes precedence over environment mode. When both are absent, the
 * default is `noop`.
 */
function resolveExecutionMode(input: {
    payloadMode?: string
    envMode?: string
}): ExecutionModeOutcome {
    const mode = input.payloadMode?.trim() || input.envMode?.trim() || "noop"

    if (mode === "noop") return { kind: "noop" }

    if (mode === "repo-write") return { kind: "repo-write" }

    return { kind: "unsupported", mode }
}

function isAddExecutionMode(value: string): value is AddExecutionMode {
    return value === "noop" || value === "repo-write"
}

export type { AddExecutionMode, ExecutionModeOutcome }
export { isAddExecutionMode, resolveExecutionMode }
