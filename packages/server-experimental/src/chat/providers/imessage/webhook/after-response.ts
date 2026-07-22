/**
 * @todo P3: Move to somewhere more generic.
 */
function afterResponse(
    task: () => Promise<void>,
    waitUntil?: (promise: Promise<unknown>) => void
): void {
    const promise = task()

    waitUntil?.(promise)
}

export { afterResponse }
