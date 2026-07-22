/**
 * @todo P2: Replace all utilities when Effect is implemented.
 */

function logImessageEvent(
    message: string,
    context?: Record<string, unknown>
): void {
    if (context) console.log(`[iMessage] ${message}`, context)
    else console.log(`[iMessage] ${message}`)
}

function previewText(text: string, maxLength = 32): string {
    const compact = text.replace(/\s+/g, " ").trim()

    if (compact.length <= maxLength) return compact

    return `${compact.slice(0, maxLength)}…`
}

function formatElapsedSeconds(elapsedMs: number): string {
    return `${(elapsedMs / 1000).toFixed(3)}s`
}

export { formatElapsedSeconds, logImessageEvent, previewText }
