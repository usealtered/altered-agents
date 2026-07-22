import type { ProviderMetadata } from "ai"
import { type } from "arktype"

const openRouterProviderMetadataSchema = type({
    openrouter: {
        "provider?": "string",
        "usage?": {
            "cost?": "number",
            "promptTokens?": "number",
            "promptTokensDetails?": {
                "cachedTokens?": "number",
                "cacheWriteTokens?": "number"
            },
            "completionTokens?": "number",
            "totalTokens?": "number"
        }
    }
})

type OpenRouterProviderMetadata = typeof openRouterProviderMetadataSchema.infer

function parseOpenRouterProviderMetadata(
    metadata: ProviderMetadata | undefined
): OpenRouterProviderMetadata | null {
    const parsedMetadata = openRouterProviderMetadataSchema(metadata)

    if (parsedMetadata instanceof type.errors) {
        console.error(parsedMetadata.summary)

        return null
    }

    return parsedMetadata
}

function formatOpenRouterCost(cost: number | undefined): string | undefined {
    if (cost === undefined) return

    return `$${cost.toFixed(4)} USD`
}

export {
    formatOpenRouterCost,
    type OpenRouterProviderMetadata,
    parseOpenRouterProviderMetadata
}
