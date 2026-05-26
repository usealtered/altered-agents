import { eq } from "drizzle-orm"
import { getDatabase } from "../../../storage/database/connection"
import { type AddJobStatus, addJobs } from "./schema"

async function updateAddJobStatus(input: {
    id: string
    status: AddJobStatus
    errorMessage?: string | null
    metadata?: Record<string, unknown>
    startedAt?: Date | null
    completedAt?: Date | null
}) {
    const db = getDatabase()

    const [updated] = await db
        .update(addJobs)
        .set({
            status: input.status,
            errorMessage: input.errorMessage ?? null,
            metadata: input.metadata ?? null,
            startedAt: input.startedAt ?? undefined,
            completedAt: input.completedAt ?? undefined
        })
        .where(eq(addJobs.id, input.id))
        .returning()

    if (!updated) throw new Error(`Failed to update ADD job: ${input.id}`)

    return updated
}

export { updateAddJobStatus }
