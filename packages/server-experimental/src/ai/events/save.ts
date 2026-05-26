import { getDatabase } from "../../storage/database/connection"
import { aiGenerationEvents } from "./schema"

async function saveAiGenerationEvent(values: {
    conversationId: string
    feature: string
    modelId: string
    provider: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    costUsd?: number
    durationMs: number
    status: "completed" | "failed"
    errorMessage?: string
}) {
    const db = getDatabase()

    const [created] = await db
        .insert(aiGenerationEvents)
        .values({
            conversationId: values.conversationId,
            feature: values.feature,
            modelId: values.modelId,
            provider: values.provider,
            promptTokens:
                values.promptTokens === undefined
                    ? null
                    : String(values.promptTokens),
            completionTokens:
                values.completionTokens === undefined
                    ? null
                    : String(values.completionTokens),
            totalTokens:
                values.totalTokens === undefined
                    ? null
                    : String(values.totalTokens),
            costUsd:
                values.costUsd === undefined ? null : String(values.costUsd),
            durationMs: String(values.durationMs),
            status: values.status,
            errorMessage: values.errorMessage ?? null
        })
        .returning()

    if (!created) throw new Error("Failed to save AI generation event.")

    return created
}

export { saveAiGenerationEvent }
