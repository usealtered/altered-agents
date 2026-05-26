import { resolve } from "node:path"
import { config } from "dotenv"

let didLoadAgentEnvironment = false

function loadAgentEnvironment(): void {
    if (didLoadAgentEnvironment) return

    config({
        path: resolve(process.cwd(), ".env.agents")
    })

    didLoadAgentEnvironment = true
}

export { loadAgentEnvironment }
