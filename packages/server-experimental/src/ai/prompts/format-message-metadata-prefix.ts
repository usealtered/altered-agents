/**
 * @todo P1: Resolve time zone dynamically from the user's locale preferences.
 */
const TIME_ZONE = "America/Edmonton" as const

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long"
})

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
})

const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
})

function formatChatMessageDateTimeMetadata(date: Date): string {
    const weekday = weekdayFormatter.format(date)
    const datePart = dateFormatter.format(date)
    const timePart = timeFormatter.format(date)

    return `${weekday}, ${datePart}, ${timePart}`
}

function formatChatMessageMetadataPrefix(
    values: (string | [key: string, value: string])[],

    options?: { separator?: string }
): string {
    const { separator = "; " } = options ?? {}

    const resolvedValues = values.map(value => {
        if (typeof value === "string") return value

        return `${value[0]}: ${value[1]}`
    })

    return `[${resolvedValues.join(separator)}] `
}

export { formatChatMessageDateTimeMetadata, formatChatMessageMetadataPrefix }
