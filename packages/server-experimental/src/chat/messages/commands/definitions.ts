const NEW_CONVERSATION_TRIGGER_PHRASES = ["/new", "/reset", "/clear"] as const

const FORWARD_WEBHOOK_TRIGGER_PHRASES = ["/dev"] as const

const COMMAND_TRIGGER_PHRASES = [
    ...NEW_CONVERSATION_TRIGGER_PHRASES,
    ...FORWARD_WEBHOOK_TRIGGER_PHRASES
] as const

type CommandTriggerPhrase = (typeof COMMAND_TRIGGER_PHRASES)[number]

export {
    COMMAND_TRIGGER_PHRASES,
    type CommandTriggerPhrase,
    FORWARD_WEBHOOK_TRIGGER_PHRASES,
    NEW_CONVERSATION_TRIGGER_PHRASES
}
