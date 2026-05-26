import { saveAiGenerationEvent } from "../../../../../ai/events/save"
import { generateResponseFromModelMessages } from "../../../../../ai/generate/response-from-model-messages"
import { IDENTITY_SYSTEM_PROMPT } from "../../../../../ai/prompts/identity"
import { handleAddIntent } from "../../../../add/intents/handle"
import { getOrCreateActiveConversationForThread } from "../../../../conversations/get-or-create-active-for-thread"
import { startNewConversationForThread } from "../../../../conversations/start-new-for-thread"
import { listChatMessagesForConversation } from "../../../../messages/list-for-conversation"
import { saveChatMessage } from "../../../../messages/save"
import { toModelMessages } from "../../../../messages/to-model-messages"
import { IMESSAGE_SYSTEM_PROMPT } from "../../behaviors/generation/prompt"
import type { ChatResponseContext } from "../../behaviors/type-and-respond"
import { containsCommandTriggerPhrase } from "./contains-command-trigger"

async function buildDirectMessageResponse({
    thread,
    message
}: ChatResponseContext): Promise<string> {
    const { text: inboundMessageText } = message

    if (
        containsCommandTriggerPhrase({
            message: inboundMessageText,
            phrases: ["/reset", "/new", "/clear"]
        })
    ) {
        await startNewConversationForThread({
            chatProvider: "sendblue",
            threadId: thread.id
        })

        return "Started a new conversation."
    }

    const conversation = await getOrCreateActiveConversationForThread({
        chatProvider: "sendblue",
        threadId: thread.id
    })

    await saveChatMessage({
        brainId: null,
        content: inboundMessageText,
        conversationId: conversation.id,
        role: "user",
        userId: null
    })

    const addIntentResponse = await handleAddIntent({
        messageText: inboundMessageText,
        threadId: thread.id,
        conversationId: conversation.id
    })

    if (addIntentResponse) {
        await saveChatMessage({
            brainId: null,
            content: addIntentResponse,
            conversationId: conversation.id,
            role: "assistant",
            userId: null
        })

        return addIntentResponse
    }

    const chatMessages = await listChatMessagesForConversation(conversation.id)
    const modelMessages = toModelMessages(chatMessages)

    let generatedMessageText: string

    try {
        const generatedResponse = await generateResponseFromModelMessages(
            modelMessages,
            {
                prompts: [IDENTITY_SYSTEM_PROMPT, IMESSAGE_SYSTEM_PROMPT]
            }
        )

        generatedMessageText = generatedResponse.text

        await saveAiGenerationEvent({
            conversationId: conversation.id,
            feature: "imessage-direct-message",
            modelId: generatedResponse.modelId,
            provider: generatedResponse.provider,
            promptTokens: generatedResponse.usage.promptTokens,
            completionTokens: generatedResponse.usage.completionTokens,
            totalTokens: generatedResponse.usage.totalTokens,
            durationMs: generatedResponse.durationMs,
            status: "completed"
        })
    } catch (error) {
        await saveAiGenerationEvent({
            conversationId: conversation.id,
            feature: "imessage-direct-message",
            modelId: "unknown",
            provider: "openrouter",
            durationMs: 0,
            status: "failed",
            errorMessage:
                error instanceof Error
                    ? error.message
                    : "Unknown generation error."
        })

        throw error
    }

    await saveChatMessage({
        brainId: null,
        content: generatedMessageText,
        conversationId: conversation.id,
        role: "assistant",
        userId: null
    })

    return generatedMessageText
}

export { buildDirectMessageResponse }
