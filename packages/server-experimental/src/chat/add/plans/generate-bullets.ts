import { botDefaultModelId } from "@altered/core-experimental/config/app"
import { generateText } from "ai"
import { getOpenRouter } from "../../../ai/provider"

const BULLET_PREFIX_PATTERN = /^[-*]\s*/

type AddPlanBullets = {
    summaryBullets: string[]
    detailBullets: string[]
}

function parseBullets(output: string): string[] {
    return output
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.replace(BULLET_PREFIX_PATTERN, "").trim())
        .filter(Boolean)
        .slice(0, 8)
}

async function generateAddPlanBullets(
    request: string
): Promise<AddPlanBullets> {
    const openRouter = getOpenRouter()

    const summary = await generateText({
        model: openRouter.chat(botDefaultModelId),
        system: [
            "You are writing implementation plans for an iMessage-based coding agent.",
            "Return ONLY bullet lines, no preface, no numbering, max 6 bullets.",
            "Each bullet must be short and concrete."
        ].join(" "),
        prompt: `Create a short implementation plan for this request:\n\n${request}`
    })

    const details = await generateText({
        model: openRouter.chat(botDefaultModelId),
        system: [
            "You are expanding implementation plan bullets.",
            "Return ONLY bullet lines, no preface, no numbering, max 8 bullets.",
            "Each bullet should include one concrete action."
        ].join(" "),
        prompt: `Expand this request into detailed action bullets:\n\n${request}`
    })

    const summaryBullets = parseBullets(summary.text)
    const detailBullets = parseBullets(details.text)

    return {
        summaryBullets:
            summaryBullets.length > 0
                ? summaryBullets
                : ["Clarify request scope and create implementation steps."],
        detailBullets:
            detailBullets.length > 0
                ? detailBullets
                : ["Implement requested feature with checks and status output."]
    }
}

export { generateAddPlanBullets }
