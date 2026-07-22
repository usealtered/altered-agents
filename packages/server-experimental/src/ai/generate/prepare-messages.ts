import type { ModelMessage } from "ai"
import type { ChatMessage } from "../../chat/messages/schema"
import { toModelMessagesForGeneration } from "../../chat/messages/to-model-messages"
import { isLargeLanguageModelId } from "../models/is-model-id"
import { messageWithOpenRouterExplicitCacheControl } from "../provider/with-cache-control"

const removeUndefinedMessages = (
    messages: (ModelMessage | undefined)[]
): ModelMessage[] => messages.filter(message => message !== undefined)

/**
 * Sets an explicit cache breakpoint on the last stable conversation turn (if enabled), and injects an ephemeral system prompt near the end of the conversation. Intended for generation only (not for persisting in the database).
 *
 * @todo P1: Implement a more comprehensive caching strategy - see notes.
 *
 * @todo P3: Try to simplify the control flow a bit.
 *
 * @remarks Anthropic (through OpenRouter) only permits cache control breakpoints on user messages. See: https://github.com/OpenRouterTeam/ai-sdk-provider/issues/498
 */
function prepareMessagesForGeneration(
    messages: ChatMessage[],

    {
        modelId,

        ephemeralPrompt,
        enableExplicitCacheControl
    }: {
        modelId: string

        ephemeralPrompt?: string
        enableExplicitCacheControl?: {
            anthropic?: boolean
        }
    }
): ModelMessage[] {
    const modelMessages = toModelMessagesForGeneration(messages)

    const { anthropic: isAnthropicCachingEnabled = false } =
        enableExplicitCacheControl ?? {}

    let ephemeralMessage: ModelMessage | undefined

    if (ephemeralPrompt) {
        ephemeralMessage = {
            /**
             * @todo P2: Experiment with the `system` role for ephemeral messages.
             */
            role: "user",
            content: ephemeralPrompt
        } as ModelMessage
    }

    const lastMessage = modelMessages.at(-1)

    //  If there are no chat messages - warn about this implementation, add the ephemeral message, and return.

    if (!lastMessage) {
        console.warn(
            "There are no chat messages - this should not happen in a normal conversation flow. Check the implementation."
        )

        return removeUndefinedMessages([ephemeralMessage])
    }

    //  If the last message is not a user message - warn about this implementation, add the ephemeral message, then return.

    if (lastMessage.role !== "user") {
        console.warn(
            "The last chat message is not a user message - this should not happen in a normal conversation flow. Check the implementation."
        )

        return removeUndefinedMessages([...modelMessages, ephemeralMessage])
    }

    const messageHistory = modelMessages.slice(0, -1)

    //  If there is no history before the last message - add the ephemeral message before the user message, then return.

    if (messageHistory.length === 0)
        return removeUndefinedMessages([ephemeralMessage, lastMessage])

    //  If no special cache control handling has to be done - add the ephemeral message between the message history and the last message, then return.

    if (!isAnthropicCachingEnabled)
        return removeUndefinedMessages([
            ...messageHistory,
            ephemeralMessage,
            lastMessage
        ])

    const lastStableUserMessageIndex = messageHistory.findLastIndex(
        message => message.role === "user"
    )

    let lastStableUserMessage = messageHistory[lastStableUserMessageIndex]

    //  If no previous stable user message can be found - add the ephemeral message between the message history and the last message, then return.

    if (lastStableUserMessageIndex < 0 || !lastStableUserMessage)
        return removeUndefinedMessages([
            ...messageHistory,
            ephemeralMessage,
            lastMessage
        ])

    //  If explicit cache control is enabled for Anthropic - apply the cache control configuration to the last stable user message.

    if (isLargeLanguageModelId(modelId, { providers: ["anthropic"] }))
        lastStableUserMessage = messageWithOpenRouterExplicitCacheControl(
            lastStableUserMessage
        )

    //  Return the messages with the cache control configuration and the ephemeral message applied.

    return removeUndefinedMessages([
        ...messageHistory.slice(0, lastStableUserMessageIndex),
        lastStableUserMessage,
        ...messageHistory.slice(lastStableUserMessageIndex + 1),

        ephemeralMessage,
        lastMessage
    ])
}

export { prepareMessagesForGeneration }
