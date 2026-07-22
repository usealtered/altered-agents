import { getEnvironmentConfig } from "@altered/core-experimental/config/environment/definitions"
import { Redis } from "@upstash/redis"

let upstashRedisClient: Redis | null | undefined

function getUpstashRedisClient(): Redis | null {
    if (upstashRedisClient !== undefined) return upstashRedisClient

    const {
        shared: {
            providers: {
                upstash: { redis }
            }
        }
    } = getEnvironmentConfig()

    try {
        upstashRedisClient = new Redis({ token: redis.secret, url: redis.url })

        return upstashRedisClient
    } catch {
        upstashRedisClient = null

        return upstashRedisClient
    }
}

export { getUpstashRedisClient }
