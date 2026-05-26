import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"
import { conversations } from "../../conversations/schema"

const ADD_PLAN_STATUSES = [
    "pending_approval",
    "approved",
    "rejected",
    "superseded"
] as const

type AddPlanStatus = (typeof ADD_PLAN_STATUSES)[number]

type AddPlanBullets = string[]

const addPlans = pgTable(
    "add_plans",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => nanoid()),

        threadId: text().notNull(),
        conversationId: text()
            .notNull()
            .references(() => conversations.id, { onDelete: "cascade" }),

        request: text().notNull(),
        summaryBullets: jsonb().$type<AddPlanBullets>().notNull(),
        detailBullets: jsonb().$type<AddPlanBullets>().notNull(),
        status: text({ enum: ADD_PLAN_STATUSES })
            .$type<AddPlanStatus>()
            .notNull()
            .default("pending_approval"),

        repositoryPlanPath: text(),
        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp({ withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => new Date())
    },
    table => [
        index().on(table.threadId, table.createdAt),
        index().on(table.conversationId, table.createdAt),
        index().on(table.status, table.createdAt)
    ]
)

type AddPlan = typeof addPlans.$inferSelect

export { ADD_PLAN_STATUSES, type AddPlan, type AddPlanStatus, addPlans }
