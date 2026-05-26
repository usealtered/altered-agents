import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

type SaveAddPlanToRepositoryInput = {
    planId: string
    request: string
    summaryBullets: string[]
    detailBullets: string[]
}

const PLAN_DIRECTORY = ".context/_generated/plans/add-jobs"

async function saveAddPlanToRepository(
    input: SaveAddPlanToRepositoryInput
): Promise<string> {
    const fileName = `add-plan-${new Date().toISOString().replace(/[:.]/g, "-")}-${input.planId}.md`
    const relativePath = `${PLAN_DIRECTORY}/${fileName}`
    const absoluteDirectory = resolve(process.cwd(), PLAN_DIRECTORY)
    const absolutePath = resolve(process.cwd(), relativePath)

    const content = [
        "# ADD Job Plan Snapshot",
        "",
        `- Plan ID: \`${input.planId}\``,
        `- Created At: \`${new Date().toISOString()}\``,
        "",
        "## Request",
        "",
        input.request,
        "",
        "## Summary Bullets",
        "",
        ...input.summaryBullets.map(bullet => `- ${bullet}`),
        "",
        "## Detailed Bullets",
        "",
        ...input.detailBullets.map(bullet => `- ${bullet}`),
        ""
    ].join("\n")

    await mkdir(absoluteDirectory, { recursive: true })
    await writeFile(absolutePath, content, "utf8")

    return relativePath
}

export { saveAddPlanToRepository }
