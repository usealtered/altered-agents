import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"
import { conversations } from "../../chat/conversations/schema"

const aiGenerationEvents = pgTable(
    "ai_generation_events",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => nanoid()),

        conversationId: text()
            .notNull()
            .references(() => conversations.id, { onDelete: "cascade" }),
        feature: text().notNull(),

        modelId: text().notNull(),
        provider: text().notNull(),
        promptTokens: text(),
        completionTokens: text(),
        totalTokens: text(),
        costUsd: text(),
        durationMs: text().notNull(),
        status: text().notNull().default("completed"),
        errorMessage: text(),

        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
    },
    table => [
        index().on(table.conversationId, table.createdAt),
        index().on(table.feature, table.createdAt),
        index().on(table.status, table.createdAt)
    ]
)

type AiGenerationEvent = typeof aiGenerationEvents.$inferSelect

export { type AiGenerationEvent, aiGenerationEvents }
