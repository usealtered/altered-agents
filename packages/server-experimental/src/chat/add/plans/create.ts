import { getDatabase } from "../../../storage/database/connection"
import { addPlans } from "./schema"

async function createAddPlan(values: {
    threadId: string
    conversationId: string
    request: string
    summaryBullets: string[]
    detailBullets: string[]
    repositoryPlanPath?: string
}) {
    const db = getDatabase()

    const [created] = await db
        .insert(addPlans)
        .values({
            ...values,
            repositoryPlanPath: values.repositoryPlanPath ?? null
        })
        .returning()

    if (!created) throw new Error("Failed to create ADD plan.")

    return created
}

export { createAddPlan }
