import type { ModelMessage } from "ai"

function modelMessageWithMetadataPrefix(
    message: ModelMessage,
    prefix: string
): ModelMessage {
    if (typeof message.content === "string")
        return {
            ...message,

            content: `${prefix}${message.content}`
        } as ModelMessage

    if (!Array.isArray(message.content)) return message

    const content = message.content.map((part, index) => {
        if (index > 0 || part.type !== "text") return part

        return { ...part, text: `${prefix}${part.text}` }
    })

    return { ...message, content } as ModelMessage
}

export { modelMessageWithMetadataPrefix }
