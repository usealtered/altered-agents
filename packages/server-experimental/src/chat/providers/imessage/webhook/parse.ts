import type { AssertExactMatch } from "@altered/core-experimental/typescript/exact-match"
import { type } from "arktype"
import type { SendblueMessagePayload } from "chat-adapter-sendblue"

const sendblueMessagePayloadSchema = type({
    "accountEmail?": "string",
    content: "string",
    is_outbound: "boolean",
    status: "string",
    error_code: "number | null",
    error_message: "string | null",
    error_reason: "string | null",
    error_detail: "string | null",
    message_handle: "string",
    date_sent: "string",
    date_updated: "string",
    from_number: "string",
    number: "string",
    to_number: "string",
    was_downgraded: "boolean | null",
    "plan?": "string",
    media_url: "string",
    message_type: "'message' | 'group' | string",
    group_id: "string",
    participants: "string[]",
    send_style: "string",
    opted_out: "boolean",
    sendblue_number: "string | null",
    service: "string",
    group_display_name: "string | null"
})

const _integrityCheck: AssertExactMatch<
    typeof sendblueMessagePayloadSchema.infer,
    SendblueMessagePayload
> = true

const parseSendblueMessagePayload = type("string.json.parse").to(
    sendblueMessagePayloadSchema
)

async function parseSendblueWebhook(request: Request): Promise<{
    body: { text: string }

    data: SendblueMessagePayload
} | null> {
    let bodyText: string

    try {
        bodyText = await request.text()
    } catch {
        return null
    }

    const data = parseSendblueMessagePayload(bodyText)

    if (data instanceof type.errors) {
        console.error(data.summary)

        return null
    }

    return {
        body: { text: bodyText },
        data
    }
}

export { parseSendblueWebhook }
