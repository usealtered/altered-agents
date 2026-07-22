import { createTemplatedText } from "./create-templated-text"

const ENVIRONMENT_SYSTEM_PROMPT = `# Environment

## Spacetime

- The current date and time is provided in an ephemeral message as \`CURRENT_DATE_TIME\`.

## Content Metadata

### Text Prefixes

- Textual content (such as chat messages) may be prefixed with metadata in the format \`[VALUE; KEY: VALUE; ...]\`. Keys are optional if the meaning of the value is heavily implied.

- Metadata prefixes are injected at generation time, and are only visible to you. They are not persisted in the database.

- The purpose of metadata prefixes are to provide contextual information about the content.

- Never generate or include metadata prefixes in your responses.

- The last chat message has no metadata prefix by design. You can assume information about the last message from the ephemeral message.` as const

const EPHEMERAL_ENVIRONMENT_SYSTEM_PROMPT =
    "CURRENT_DATE_TIME: {{currentDateTime}}" as const

const edmontonDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Edmonton",

    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
})

/**
 * @todo P1: Resolve to the user's local time rather than being fixed to Edmonton.
 */
function formatDateTime(date: Date): string {
    return edmontonDateTimeFormatter.format(date)
}

function createEphemeralEnvironmentSystemPrompt(): string {
    return createTemplatedText(EPHEMERAL_ENVIRONMENT_SYSTEM_PROMPT, {
        currentDateTime: formatDateTime(new Date())
    })
}

export {
    createEphemeralEnvironmentSystemPrompt,
    ENVIRONMENT_SYSTEM_PROMPT,
    formatDateTime
}
