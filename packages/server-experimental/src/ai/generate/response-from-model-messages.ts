import { botDefaultModelId } from "@altered/core-experimental/config/app"
import { generateText, type ModelMessage } from "ai"
import { constructPrompts } from "../prompts/constructor"
import { IDENTITY_SYSTEM_PROMPT } from "../prompts/identity"
import { getOpenRouter } from "../provider"

type GenerationUsage = {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
}

type GeneratedResponse = {
    text: string
    modelId: string
    provider: "openrouter"
    durationMs: number
    usage: GenerationUsage
}

/**
 * @remarks Coming up, we may want to return the entire message part/content rather than just the text.
 */
async function generateResponseFromModelMessages(
    messages: ModelMessage[],
    config?: { prompts?: string[] }
): Promise<GeneratedResponse> {
    const { prompts = [IDENTITY_SYSTEM_PROMPT] } = config ?? {}

    const openRouter = getOpenRouter()
    const startedAt = Date.now()

    const result = await generateText({
        model: openRouter.chat(botDefaultModelId),

        system: constructPrompts(prompts),

        messages
    })

    return {
        text: result.text,
        modelId: botDefaultModelId,
        provider: "openrouter",
        durationMs: Date.now() - startedAt,
        usage: {
            promptTokens: result.usage?.inputTokens,
            completionTokens: result.usage?.outputTokens,
            totalTokens: result.usage?.totalTokens
        }
    }
}

export { type GeneratedResponse, generateResponseFromModelMessages }
