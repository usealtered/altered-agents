import { type } from "arktype"

//  TODO P0: Convert to Effect Config.

/**
 * @remarks Mirrors `example.env`.
 */
const environmentConfigSchema = type({
    shared: {
        config: {
            env: "string"
        },

        admin: {
            phoneNumber: "string"
        },

        storage: {
            database: {
                url: "string"
            },
            kv: {
                url: "string"
            }
        },

        providers: {
            sendblue: {
                public: "string",
                secret: "string",
                number: "string",
                signing: "string"
            },
            openrouter: {
                secret: "string"
            },
            ngrok: {
                url: "string",
                secret: "string"
            },
            upstash: {
                redis: {
                    url: "string",
                    secret: "string"
                }
            }
        }
    }
})

type EnvironmentConfig = typeof environmentConfigSchema.infer

let environmentConfig: EnvironmentConfig | undefined

function getEnvironmentConfig(): EnvironmentConfig {
    environmentConfig ??= environmentConfigSchema.assert({
        shared: {
            config: {
                env: process.env.SHARED_CONFIG_ENV
            },

            admin: {
                phoneNumber: process.env.SHARED_ADMIN_PHONE_NUMBER
            },

            storage: {
                database: {
                    url: process.env.SHARED_STORAGE_DATABASE_URL
                },
                kv: {
                    url: process.env.SHARED_STORAGE_KV_URL
                }
            },

            providers: {
                sendblue: {
                    public: process.env.SHARED_PROVIDER_SENDBLUE_PUBLIC,
                    secret: process.env.SHARED_PROVIDER_SENDBLUE_SECRET,
                    number: process.env.SHARED_PROVIDER_SENDBLUE_NUMBER,
                    signing: process.env.SHARED_PROVIDER_SENDBLUE_SIGNING
                },
                openrouter: {
                    secret: process.env.SHARED_PROVIDER_OPENROUTER_SECRET
                },
                ngrok: {
                    url: process.env.SHARED_PROVIDER_NGROK_URL,
                    secret: process.env.SHARED_PROVIDER_NGROK_SECRET
                },
                upstash: {
                    redis: {
                        url: process.env.SHARED_PROVIDER_UPSTASH_REDIS_URL,
                        secret: process.env.SHARED_PROVIDER_UPSTASH_REDIS_SECRET
                    }
                }
            }
        }
    })

    return environmentConfig
}

export { type EnvironmentConfig, getEnvironmentConfig }
