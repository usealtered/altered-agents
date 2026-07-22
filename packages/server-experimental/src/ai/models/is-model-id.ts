const LLM_PROVIDERS = ["anthropic"] as const

type LLMProvider = (typeof LLM_PROVIDERS)[number]

function isLargeLanguageModelId(
    id: string,
    options?: { providers?: LLMProvider[] }
): boolean {
    const { providers = LLM_PROVIDERS } = options ?? {}

    return providers.some(provider => id.startsWith(`${provider}/`))
}

export { isLargeLanguageModelId, type LLMProvider }
