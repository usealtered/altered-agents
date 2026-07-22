import {
    COMMAND_TRIGGER_PHRASES,
    type CommandTriggerPhrase
} from "./definitions"

function containsCommandTriggerPhrases({
    message,
    phrases = [...COMMAND_TRIGGER_PHRASES]
}: {
    message: string
    phrases?: CommandTriggerPhrase[]
}): boolean {
    return phrases.some(phrase => {
        const normalizedMessage = message.trim().toLowerCase()

        const isTriggerPhrase = normalizedMessage === phrase
        const startsWithTriggerPhrase = normalizedMessage.startsWith(
            `${phrase} `
        )

        return isTriggerPhrase || startsWithTriggerPhrase
    })
}

export { containsCommandTriggerPhrases }
