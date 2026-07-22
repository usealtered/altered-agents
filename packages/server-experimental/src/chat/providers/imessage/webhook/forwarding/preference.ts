const FORWARD_WEBHOOK_TO_DEVELOPMENT_PREFERENCE_KEY =
    "chat:imessage:admin:forward-webhook-to-development"

const getForwardWebhookToDevelopmentPreferenceKey = ({
    phoneNumber
}: {
    phoneNumber: string
}): string => `${FORWARD_WEBHOOK_TO_DEVELOPMENT_PREFERENCE_KEY}:${phoneNumber}`

export { getForwardWebhookToDevelopmentPreferenceKey }
