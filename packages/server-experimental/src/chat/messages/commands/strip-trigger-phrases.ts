import {
    COMMAND_TRIGGER_PHRASES,
    type CommandTriggerPhrase
} from "./definitions"

/**
 * Removes all leading space, the command trigger phrases, and one trailing space after each phrase if any trigger phrases are detected - otherwise returns the original message. Detection is case-insensitive.
 */
function stripCommandTriggerPhrases({
    message,
    phrases = [...COMMAND_TRIGGER_PHRASES]
}: {
    message: string
    phrases?: CommandTriggerPhrase[]
}): string {
    let strippedMessage = message

    for (const phrase of phrases) {
        const trimmedMessage = strippedMessage.trimStart()
        const normalizedMessage = trimmedMessage.toLowerCase()

        if (normalizedMessage === phrase) return ""

        if (normalizedMessage.startsWith(`${phrase} `))
            strippedMessage = trimmedMessage.slice(phrase.length + 1)
    }

    return strippedMessage
}

export { stripCommandTriggerPhrases }
