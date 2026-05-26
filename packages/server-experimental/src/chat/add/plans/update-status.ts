import { eq } from "drizzle-orm"
import { getDatabase } from "../../../storage/database/connection"
import { type AddPlanStatus, addPlans } from "./schema"

async function updateAddPlanStatus(id: string, status: AddPlanStatus) {
    const db = getDatabase()

    const [updated] = await db
        .update(addPlans)
        .set({ status })
        .where(eq(addPlans.id, id))
        .returning()

    if (!updated) throw new Error(`Failed to update ADD plan status: ${id}`)

    return updated
}

async function updateAddPlanRepositoryPath(
    id: string,
    repositoryPlanPath: string
) {
    const db = getDatabase()

    const [updated] = await db
        .update(addPlans)
        .set({ repositoryPlanPath })
        .where(eq(addPlans.id, id))
        .returning()

    if (!updated)
        throw new Error(`Failed to update ADD plan repository path: ${id}`)

    return updated
}

export { updateAddPlanRepositoryPath, updateAddPlanStatus }
