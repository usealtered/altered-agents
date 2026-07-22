import { isDevelopment } from "@altered/core-experimental/config/environment/is-development"
import type { WebhookOptions } from "chat"
import { getKvBoolean, toggleKvBoolean } from "../../../../storage/kv/basic"
import { initializeAlteredChat } from "../../../instance"
import { respondFromRaw } from "../behaviors/respond-from-raw"
import { afterResponse } from "./after-response"
import {
    checkPermissionToForwardWebhook,
    containsForwardWebhookTriggerPhrase,
    forwardSendblueWebhook,
    isForwardedWebhook
} from "./forwarding"
import { getForwardWebhookToDevelopmentPreferenceKey } from "./forwarding/preference"
import { parseSendblueWebhook } from "./parse"

/**
 * @todo P3: Clean up the distinction between slash commands that immediately send a message and return regardless of additional message content, and those who detect a command but also handle the remaining message content.
 */
async function processSendblueWebhook(
    request: Request,
    options?: Pick<WebhookOptions, "waitUntil">
): Promise<Response> {
    const chat = await initializeAlteredChat()

    const handleWebhook = chat.webhooks.sendblue

    if (isDevelopment() || isForwardedWebhook(request))
        return handleWebhook(request, options)

    const parsedRequest = await parseSendblueWebhook(request)
    if (!parsedRequest)
        throw new Error(
            "Failed to parse Sendblue webhook request. This should never happen.",
            { cause: request }
        )

    const messagePayload = parsedRequest.data

    const hasPermissionToForwardWebhook = checkPermissionToForwardWebhook({
        messagePayload
    })

    if (containsForwardWebhookTriggerPhrase({ messagePayload })) {
        afterResponse(async () => {
            if (!hasPermissionToForwardWebhook) {
                await respondFromRaw({
                    messagePayload,
                    createResponse: _context =>
                        "You do not have permission to use this feature."
                })

                return
            }

            const {
                success: checkWasForwardingEnabledSuccess,
                value: wasForwardingEnabled
            } = await getKvBoolean({
                key: getForwardWebhookToDevelopmentPreferenceKey({
                    phoneNumber: messagePayload.from_number
                })
            })

            if (!checkWasForwardingEnabledSuccess) {
                console.error(
                    "Failed to check if forwarding is enabled. No preference changes will be made."
                )

                await respondFromRaw({
                    messagePayload,
                    createResponse: _context =>
                        "Unable to update forwarding preferences. Please try again later."
                })

                return
            }

            const { success, value: isForwardingEnabled } =
                await toggleKvBoolean({
                    previous: wasForwardingEnabled ?? false,

                    key: getForwardWebhookToDevelopmentPreferenceKey({
                        phoneNumber: messagePayload.from_number
                    })
                })

            if (!success) {
                await respondFromRaw({
                    messagePayload,
                    createResponse: _context =>
                        "Unable to update forwarding preferences. Please try again later."
                })

                return
            }

            await respondFromRaw({
                messagePayload,
                createResponse: _context =>
                    isForwardingEnabled
                        ? "Webhook forwarding is now enabled. Messages will be directed to the development server."
                        : "Webhook forwarding is now disabled. Messages will be handled in production."
            })
        }, options?.waitUntil)

        return new Response("OK", { status: 200 })
    }

    if (hasPermissionToForwardWebhook) {
        const {
            success: checkIsForwardingEnabledSuccess,
            value: isForwardingEnabled
        } = await getKvBoolean({
            key: getForwardWebhookToDevelopmentPreferenceKey({
                phoneNumber: messagePayload.from_number
            })
        })

        if (!checkIsForwardingEnabledSuccess) {
            console.error(
                "Failed to check if forwarding is enabled. Falling back to production mode."
            )

            return handleWebhook(
                new Request(request.url, {
                    body: parsedRequest.body.text,
                    headers: request.headers,
                    method: request.method
                }),

                options
            )
        }

        if (isForwardingEnabled ?? false) {
            afterResponse(async () => {
                const { success } = await forwardSendblueWebhook({
                    request,
                    messagePayload
                })

                if (!success)
                    await respondFromRaw({
                        messagePayload,
                        createResponse: _context =>
                            "Unable to reach the development server. Please try again later."
                    })
            }, options?.waitUntil)

            return new Response("OK", { status: 200 })
        }
    }

    return handleWebhook(
        new Request(request.url, {
            body: parsedRequest.body.text,
            headers: request.headers,
            method: request.method
        }),

        options
    )
}

export { processSendblueWebhook }
