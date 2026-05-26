import { getDatabase } from "../../../storage/database/connection"
import { addJobs } from "./schema"

function assertAgentBranchName(branchName: string) {
    if (!branchName.startsWith("agents/"))
        throw new Error(
            `ADD jobs can only target branches under agents/* (received: ${branchName}).`
        )
}

async function createAddJob(values: {
    planId: string
    branchName: string
    runnerType?: string
}) {
    assertAgentBranchName(values.branchName)

    const db = getDatabase()

    const [created] = await db
        .insert(addJobs)
        .values({
            ...values,
            runnerType: values.runnerType ?? "cursor"
        })
        .returning()

    if (!created) throw new Error("Failed to create ADD job.")

    return created
}

export { createAddJob }
