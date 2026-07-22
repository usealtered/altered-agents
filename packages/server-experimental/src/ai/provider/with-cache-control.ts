import type { OpenRouterChatSettings } from "@openrouter/ai-sdk-provider"
import type { ModelMessage } from "ai"

/**
 * @remarks Currently designated for Anthropic, as most other providers handle cache control implicitly. See notes for future strategy.
 */
const openRouterCacheControlOptions = {
    type: "ephemeral",

    ttl: "1h"
} as const satisfies OpenRouterChatSettings["cache_control"]

function messageWithOpenRouterExplicitCacheControl(
    message: ModelMessage
): ModelMessage {
    return {
        ...message,

        providerOptions: {
            ...message.providerOptions,

            openrouter: {
                ...message.providerOptions?.openrouter,

                cacheControl: openRouterCacheControlOptions
            }
        }
    }
}

export { messageWithOpenRouterExplicitCacheControl }
