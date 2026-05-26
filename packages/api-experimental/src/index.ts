import { loadAgentEnvironment } from "@altered/core-experimental/config/load-env"
import { resolveApiOrigin } from "@altered/core-experimental/config/routing"
import { styleTerminalText } from "@altered/core-experimental/misc/style-terminal-text"
import { Hono } from "hono"
import { logger } from "hono/logger"
import { customLogger } from "./misc/custom-logger"
import { router } from "./routers"

loadAgentEnvironment()

class ALTEREDAPI extends Hono {
    constructor() {
        super()

        this.use(logger(customLogger))
        this.route("/", router)
    }

    async serve() {
        //  TODO P0: Implement with Effect.

        const port = Number(process.env.API_CONFIG_PORT)
        if (Number.isNaN(port))
            throw new Error(
                "'API_CONFIG_PORT' environment variable is invalid."
            )

        const origin = resolveApiOrigin({ target: "api" })

        //  We make this import dynamic so that it isn't unnecessarily loaded in Vercel Function deployments.

        const { serve } = await import("@hono/node-server")

        return serve(
            {
                fetch: this.fetch,
                port
            },
            _ =>
                console.log(
                    `Server started at: ${styleTerminalText(
                        origin,
                        defaultStyle => [...defaultStyle, "underline"]
                    )}`
                )
        )
    }
}

export default ALTEREDAPI
