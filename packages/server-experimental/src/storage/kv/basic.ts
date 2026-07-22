import { getUpstashRedisClient } from "./instance"

async function setKv({
    key,
    value
}: {
    key: string
    value: string
}): Promise<{ success: boolean }> {
    const client = getUpstashRedisClient()
    if (!client) {
        console.error(
            "Failed to set KV: Upstash Redis client not found. This should never happen."
        )

        return { success: false }
    }

    try {
        await client.set(key, value)

        return { success: true }
    } catch {
        console.error(`Failed to set KV: ${key} = ${value}`)

        return { success: false }
    }
}

async function getKv({
    key
}: {
    key: string
}): Promise<{ success: boolean; value: unknown }> {
    const client = getUpstashRedisClient()
    if (!client) {
        console.error(
            "Failed to get KV: Upstash Redis client not found. This should never happen."
        )

        return { success: false, value: null }
    }

    try {
        return { success: true, value: await client.get(key) }
    } catch {
        console.error(`Failed to get KV: ${key}`)

        return { success: false, value: null }
    }
}

function setKvBoolean({
    key,
    value
}: {
    key: string
    value: boolean
}): Promise<{ success: boolean }> {
    return setKv({ key, value: value ? "1" : "0" })
}

function parseKvBooleanValue(value: unknown): boolean | null {
    if (value === null || value === undefined) return null

    if (value === true || value === 1) return true
    if (value === false || value === 0) return false

    if (typeof value !== "string") return null

    const normalized = value.trim().toLowerCase()

    if (normalized === "1" || normalized === "true") return true
    if (normalized === "0" || normalized === "false") return false

    return null
}

async function getKvBoolean({
    key
}: {
    key: string
}): Promise<
    { success: true; value: boolean | null } | { success: false; value: null }
> {
    const { success, value } = await getKv({ key })
    if (!success) return { success: false, value: null }

    const parsedValue = parseKvBooleanValue(value)

    const invalidValue =
        parsedValue === null && value !== null && value !== undefined

    if (invalidValue) {
        console.error(
            `Failed to get KV boolean: Invalid value for key "${key}". Expected boolean-compatible value.`
        )

        return { success: false, value: null }
    }

    return { success: true, value: parsedValue }
}

async function toggleKvBoolean({
    previous,

    key
}: {
    previous?: boolean

    key: string
}): Promise<
    { success: true; value: boolean } | { success: false; value: null }
> {
    const resolvedPrevious =
        previous === undefined
            ? await getKvBoolean({ key })
            : { success: true, value: previous }

    if (!resolvedPrevious.success) {
        console.error(
            `Failed to toggle KV boolean: failed to get previous value for key "${key}".`
        )

        return { success: false, value: null }
    }

    const nextValue = resolvedPrevious.value ? !resolvedPrevious.value : true

    const { success } = await setKvBoolean({ key, value: nextValue })
    if (!success) return { success: false, value: null }

    return { success: true, value: nextValue }
}

export { getKv, getKvBoolean, setKv, setKvBoolean, toggleKvBoolean }
