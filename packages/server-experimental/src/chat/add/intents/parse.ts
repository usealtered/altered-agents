type AddIntent =
    | { kind: "help" }
    | { kind: "plan"; request: string }
    | { kind: "expand"; planId?: string }
    | { kind: "approve"; planId?: string }
    | { kind: "reject"; planId?: string; reason?: string }
    | { kind: "status"; jobId?: string }
    | { kind: "stop"; jobId?: string }
    | { kind: "cost" }
    | { kind: "health" }
    | { kind: "none" }

const ID_PATTERN = /[A-Za-z0-9_-]{10,}/

type ParseContext = {
    source: string
    text: string
    detectedId?: string
}

function includesAny(text: string, phrases: string[]): boolean {
    return phrases.some(phrase => text.includes(phrase))
}

function parseSlashIntent({ source, text }: ParseContext): AddIntent | null {
    if (text.startsWith("/help")) return { kind: "help" }

    if (text.startsWith("/plan")) {
        const request = source.slice("/plan".length).trim()

        return { kind: "plan", request: request || source }
    }

    if (text.startsWith("/expand"))
        return {
            kind: "expand",
            planId: source.slice("/expand".length).trim() || undefined
        }

    if (text.startsWith("/approve"))
        return {
            kind: "approve",
            planId: source.slice("/approve".length).trim() || undefined
        }

    if (text.startsWith("/reject")) {
        const rest = source.slice("/reject".length).trim()

        return {
            kind: "reject",
            planId: rest.match(ID_PATTERN)?.[0],
            reason: rest || undefined
        }
    }

    if (text.startsWith("/run-status"))
        return {
            kind: "status",
            jobId: source.slice("/run-status".length).trim() || undefined
        }

    if (text.startsWith("/stop"))
        return {
            kind: "stop",
            jobId: source.slice("/stop".length).trim() || undefined
        }

    if (text.startsWith("/cost")) return { kind: "cost" }
    if (text.startsWith("/health")) return { kind: "health" }

    return null
}

function parseNaturalLanguageIntent({
    source,
    text,
    detectedId
}: ParseContext): AddIntent {
    if (
        text === "help" ||
        includesAny(text, ["what can you do", "show commands"])
    )
        return { kind: "help" }

    if (
        includesAny(text, ["make a plan", "create a plan", "i want a plan"]) ||
        text.startsWith("plan ")
    )
        return { kind: "plan", request: source }

    if (includesAny(text, ["expand point", "expand plan"]))
        return { kind: "expand", planId: detectedId }

    if (text === "approve" || text.includes("approve this"))
        return { kind: "approve", planId: detectedId }

    if (includesAny(text, ["reject", "do not approve"]))
        return { kind: "reject", planId: detectedId, reason: source }

    if (
        includesAny(text, ["run status", "job status"]) ||
        text.startsWith("status")
    )
        return { kind: "status", jobId: detectedId }

    if (text.startsWith("stop") || text.includes("stop job"))
        return { kind: "stop", jobId: detectedId }

    if (text.includes("cost")) return { kind: "cost" }
    if (text.includes("health")) return { kind: "health" }

    return { kind: "none" }
}

function parseAddIntent(messageText: string): AddIntent {
    const source = messageText.trim()
    if (!source) return { kind: "none" }

    const context: ParseContext = {
        source,
        text: source.toLowerCase(),
        detectedId: source.match(ID_PATTERN)?.[0]
    }

    return (
        parseSlashIntent(context) ??
        parseNaturalLanguageIntent(context) ??
        ({ kind: "none" } satisfies AddIntent)
    )
}

export { type AddIntent, parseAddIntent }
