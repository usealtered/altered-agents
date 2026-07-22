import { getEnvironmentConfig } from "@altered/core-experimental/config/environment/definitions"
import { FORWARD_WEBHOOK_TRIGGER_PHRASES } from "@altered/server-experimental/chat/messages/commands/definitions"
import type { SendblueMessagePayload } from "chat-adapter-sendblue"
import { containsCommandTriggerPhrases } from "../../../../messages/commands/contains-trigger-phrases"

const SENDBLUE_SIGNING_HEADER_NAME = "sb-signing-secret"

const FORWARDED_REQUEST_HEADER_NAME = "x-altered-forwarded-request"
const FORWARDED_REQUEST_HEADER_VALUE = "1"

function createSendblueWebhookForwardingHeaders(headers: Headers): Headers {
    const forwardingHeaders = new Headers()

    forwardingHeaders.set("content-type", "application/json")

    const signingSecret = headers.get(SENDBLUE_SIGNING_HEADER_NAME)
    if (signingSecret)
        forwardingHeaders.set(SENDBLUE_SIGNING_HEADER_NAME, signingSecret)

    forwardingHeaders.set(
        FORWARDED_REQUEST_HEADER_NAME,
        FORWARDED_REQUEST_HEADER_VALUE
    )

    return forwardingHeaders
}

const isForwardedWebhook = (request: Request): boolean =>
    request.headers.get(FORWARDED_REQUEST_HEADER_NAME) ===
    FORWARDED_REQUEST_HEADER_VALUE

const containsForwardWebhookTriggerPhrase = ({
    messagePayload
}: {
    messagePayload: SendblueMessagePayload
}): boolean =>
    containsCommandTriggerPhrases({
        message: messagePayload.content,
        phrases: [...FORWARD_WEBHOOK_TRIGGER_PHRASES]
    })

const checkPermissionToForwardWebhook = ({
    messagePayload
}: {
    messagePayload: SendblueMessagePayload
}): boolean =>
    messagePayload.from_number ===
    getEnvironmentConfig().shared.admin.phoneNumber

/**
 * @todo P3: Use a dynamic routing helper later.
 */
function getSendblueWebhookUrl({
    environment: _environment
}: {
    environment: "development"
}): string {
    const developmentOrigin = getEnvironmentConfig().shared.providers.ngrok.url

    const SENDBLUE_WEBHOOK_PATH = "/webhooks/sendblue"

    return new URL(SENDBLUE_WEBHOOK_PATH, developmentOrigin).toString()
}

/**
 * @todo P1: Add retry logic and error handling once Effect is implemented.
 */
async function forwardSendblueWebhook({
    request,
    messagePayload
}: {
    request: Request
    messagePayload: SendblueMessagePayload
}): Promise<{ success: boolean }> {
    const webhookUrl = getSendblueWebhookUrl({ environment: "development" })

    const forwardingHeaders = createSendblueWebhookForwardingHeaders(
        request.headers
    )

    try {
        const response = await fetch(webhookUrl, {
            body: JSON.stringify(messagePayload),
            headers: forwardingHeaders,
            method: request.method
        })

        return { success: response.ok }
    } catch {
        return { success: false }
    }
}

export {
    checkPermissionToForwardWebhook,
    containsForwardWebhookTriggerPhrase,
    FORWARDED_REQUEST_HEADER_NAME,
    FORWARDED_REQUEST_HEADER_VALUE,
    forwardSendblueWebhook,
    isForwardedWebhook
}
