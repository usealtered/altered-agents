import { getEnvironmentConfig } from "@altered/core-experimental/config/environment/definitions"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

let openrouter: ReturnType<typeof createOpenRouter> | undefined

function getOpenRouter() {
    if (!openrouter) {
        const {
            shared: {
                providers: { openrouter: openrouterConfig }
            }
        } = getEnvironmentConfig()

        openrouter = createOpenRouter({
            apiKey: openrouterConfig.secret
        })
    }

    return openrouter
}

export { getOpenRouter }
