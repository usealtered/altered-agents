import type { SendblueMessagePayload } from "chat-adapter-sendblue"
import { getAlteredChat, initializeAlteredChat } from "../../../instance"
import type { ChatResponseContext } from "./type-and-respond"

/**
 * @remarks Mirrors `SendblueAdapter`'s private `threadIdFromPayload`.
 */
function threadIdFromSendbluePayload(data: SendblueMessagePayload): string {
    const adapter = getAlteredChat().getAdapter("sendblue")

    const fromNumber =
        data.sendblue_number ??
        (data.is_outbound ? data.from_number : data.to_number)

    if (data.group_id.length > 0)
        return adapter.encodeThreadId({ fromNumber, groupId: data.group_id })

    const contactNumber = data.is_outbound ? data.to_number : data.from_number

    return adapter.encodeThreadId({ fromNumber, contactNumber })
}

function getContextFromSendbluePayload(
    data: SendblueMessagePayload
): ChatResponseContext {
    const chat = getAlteredChat()
    const adapter = chat.getAdapter("sendblue")

    return {
        chat,
        message: adapter.parseMessage(data),
        thread: chat.thread(threadIdFromSendbluePayload(data))
    }
}

async function respondFromRaw({
    messagePayload,
    createResponse
}: {
    messagePayload: SendblueMessagePayload
    createResponse: (context: ChatResponseContext) => string | Promise<string>
}): Promise<void> {
    await initializeAlteredChat()

    const context = getContextFromSendbluePayload(messagePayload)

    const outboundMessage = await createResponse(context)

    await context.thread.post(outboundMessage)
}

export {
    getContextFromSendbluePayload,
    respondFromRaw,
    threadIdFromSendbluePayload
}
