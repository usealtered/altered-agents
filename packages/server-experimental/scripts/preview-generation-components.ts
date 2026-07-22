import { botDefaultModelId } from "@altered/core-experimental/config/app"
import type { ModelMessage } from "ai"
import { prepareMessagesForGeneration } from "../src/ai/generate/prepare-messages"
import type { ChatMessage } from "../src/chat/messages/schema"
import { composeSystemPrompt } from "../src/chat/providers/imessage/behaviors/generation/compose-system-prompt"

const createLogSectionHeader = ({ title }: { title: string }) => {
    console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}\n`)
}

const DEMO_BASE_TIME = new Date()

function createDemoMessage({
    role,
    content,

    timeOffsetInMinutes
}: {
    role: ChatMessage["role"]
    content: string

    timeOffsetInMinutes: number
}): ChatMessage {
    const createdAt = new Date(
        DEMO_BASE_TIME.getTime() + timeOffsetInMinutes * 60_000
    )

    return {
        id: `preview-demo-${timeOffsetInMinutes}-${role}`,
        conversationId: "preview-demo-conversation",
        userId: null,
        brainId: null,
        role,
        content,
        createdAt,
        updatedAt: createdAt
    }
}

const demoMessages: ChatMessage[] = [
    createDemoMessage({
        timeOffsetInMinutes: 0,
        role: "user",
        content: "Morning — can you sanity-check our prompt caching setup?"
    }),

    createDemoMessage({
        timeOffsetInMinutes: 2,
        role: "assistant",
        content:
            "Yes. Anchor cache control on the last stable user turn in history; keep the inbound user and datetime tail uncached."
    }),

    createDemoMessage({
        timeOffsetInMinutes: 5,
        role: "user",
        content: "What about provider flips on OpenRouter?"
    }),

    createDemoMessage({
        timeOffsetInMinutes: 8,
        role: "assistant",
        content:
            "Sticky routing can move you off Anthropic after idle time, which often invalidates prior cache reads until the next write turn."
    }),

    createDemoMessage({
        timeOffsetInMinutes: 12,
        role: "user",
        content:
            "What should I expect on my next inbound message after this preview?"
    })
]

function getModelMessageTextContent(content: ModelMessage["content"]): string {
    if (typeof content === "string") return content

    if (Array.isArray(content))
        return content.map(part => JSON.stringify(part)).join(" | ")

    return String(content)
}

function formatPreparedMessageDemoComponents(
    message: ModelMessage,
    index: number
): string {
    const cacheControl = message.providerOptions?.openrouter?.cacheControl
    const cacheLabel = cacheControl
        ? ` [cache: ${JSON.stringify(cacheControl)}]`
        : ""

    return `[${index}] ${message.role}${cacheLabel}\n\n    ${getModelMessageTextContent(message.content)}\n`
}

const { initial: initialSystemPrompt, ephemeral: ephemeralSystemPrompt } =
    composeSystemPrompt()

createLogSectionHeader({ title: "INITIAL SYSTEM PROMPT" })
console.log(initialSystemPrompt)

createLogSectionHeader({ title: "EPHEMERAL SYSTEM PROMPT" })
console.log(ephemeralSystemPrompt)

const preparedMessages = prepareMessagesForGeneration(demoMessages, {
    modelId: botDefaultModelId,
    ephemeralPrompt: ephemeralSystemPrompt,
    enableExplicitCacheControl: { anthropic: true }
})

createLogSectionHeader({ title: "PREPARED MODEL MESSAGES" })
for (const [index, message] of preparedMessages.entries())
    console.log(formatPreparedMessageDemoComponents(message, index))
