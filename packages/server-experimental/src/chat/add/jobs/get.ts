import { desc, eq } from "drizzle-orm"
import { getDatabase } from "../../../storage/database/connection"
import { addPlans } from "../plans/schema"
import { addJobs } from "./schema"

function getAddJobById(id: string) {
    const db = getDatabase()

    return db
        .select()
        .from(addJobs)
        .where(eq(addJobs.id, id))
        .limit(1)
        .then(rows => rows[0])
}

function getLatestAddJobForPlan(planId: string) {
    const db = getDatabase()

    return db
        .select()
        .from(addJobs)
        .where(eq(addJobs.planId, planId))
        .orderBy(desc(addJobs.createdAt))
        .limit(1)
        .then(rows => rows[0])
}

function getLatestAddJobForThread(threadId: string) {
    const db = getDatabase()

    return db
        .select({ job: addJobs })
        .from(addJobs)
        .innerJoin(addPlans, eq(addPlans.id, addJobs.planId))
        .where(eq(addPlans.threadId, threadId))
        .orderBy(desc(addJobs.createdAt))
        .limit(1)
        .then(rows => rows[0]?.job)
}

function listRecentAddJobsForThread(threadId: string, limit = 10) {
    const db = getDatabase()

    return db
        .select({ job: addJobs })
        .from(addJobs)
        .innerJoin(addPlans, eq(addPlans.id, addJobs.planId))
        .where(eq(addPlans.threadId, threadId))
        .orderBy(desc(addJobs.createdAt))
        .limit(limit)
        .then(rows => rows.map(row => row.job))
}

export {
    getAddJobById,
    getLatestAddJobForPlan,
    getLatestAddJobForThread,
    listRecentAddJobsForThread
}
