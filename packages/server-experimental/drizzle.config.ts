import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { getEnvironmentConfig } from "@altered/core-experimental/config/environment"
import { loadAgentEnvironment } from "@altered/core-experimental/config/load-env"
import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

loadAgentEnvironment()

config({
    path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env.agents")
})

const {
    shared: {
        storage: { database }
    }
} = getEnvironmentConfig()

export default defineConfig({
    schema: "./src/**/schema.ts",
    dialect: "postgresql",

    dbCredentials: { url: database.url },
    casing: "snake_case"
})
