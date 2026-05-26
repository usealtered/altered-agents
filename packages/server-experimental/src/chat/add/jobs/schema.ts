import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"
import { addPlans } from "../plans/schema"

const ADD_JOB_STATUSES = [
    "queued",
    "running",
    "completed",
    "failed",
    "cancelled",
    "blocked"
] as const

type AddJobStatus = (typeof ADD_JOB_STATUSES)[number]

type AddJobMetadata = {
    commitSha?: string
    deploymentUrl?: string
    logs?: string[]
    notes?: string[]
}

const addJobs = pgTable(
    "add_jobs",
    {
        id: text()
            .primaryKey()
            .notNull()
            .$defaultFn(() => nanoid()),

        planId: text()
            .notNull()
            .references(() => addPlans.id, { onDelete: "cascade" }),

        status: text({ enum: ADD_JOB_STATUSES })
            .$type<AddJobStatus>()
            .notNull()
            .default("queued"),

        branchName: text().notNull(),
        runnerType: text().notNull().default("cursor"),
        errorMessage: text(),
        metadata: jsonb().$type<AddJobMetadata>(),

        startedAt: timestamp({ withTimezone: true }),
        completedAt: timestamp({ withTimezone: true }),

        createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp({ withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdateFn(() => new Date())
    },
    table => [
        index().on(table.planId, table.createdAt),
        index().on(table.status, table.createdAt),
        index().on(table.branchName, table.createdAt)
    ]
)

type AddJob = typeof addJobs.$inferSelect

export { ADD_JOB_STATUSES, type AddJob, type AddJobStatus, addJobs }
