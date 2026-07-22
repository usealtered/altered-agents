import { botDefaultModelId } from "@altered/core-experimental/config/app"
import type { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createOpenRouterChatModelOptions } from "./create-chat-model-options"
import { getOpenRouter } from "./instance"

function createOpenRouterChatModel(options?: {
    modelId?: string
}): ReturnType<ReturnType<typeof createOpenRouter>["chat"]> {
    const { modelId = botDefaultModelId } = options ?? {}

    const openRouter = getOpenRouter()

    return openRouter.chat(
        modelId,
        createOpenRouterChatModelOptions({ modelId })
    )
}

export { createOpenRouterChatModel }
