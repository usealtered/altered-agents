import { and, desc, eq, inArray } from "drizzle-orm"
import { getDatabase } from "../../../storage/database/connection"
import { addPlans } from "./schema"

function getAddPlanById(id: string) {
    const db = getDatabase()

    return db
        .select()
        .from(addPlans)
        .where(eq(addPlans.id, id))
        .limit(1)
        .then(rows => rows[0])
}

function getLatestAddPlanForThread(
    threadId: string,
    statuses?: Array<
        "pending_approval" | "approved" | "rejected" | "superseded"
    >
) {
    const db = getDatabase()

    if (!statuses || statuses.length === 0)
        return db
            .select()
            .from(addPlans)
            .where(eq(addPlans.threadId, threadId))
            .orderBy(desc(addPlans.createdAt))
            .limit(1)
            .then(rows => rows[0])

    return db
        .select()
        .from(addPlans)
        .where(
            and(
                eq(addPlans.threadId, threadId),
                inArray(addPlans.status, statuses)
            )
        )
        .orderBy(desc(addPlans.createdAt))
        .limit(1)
        .then(rows => rows[0])
}

export { getAddPlanById, getLatestAddPlanForThread }
