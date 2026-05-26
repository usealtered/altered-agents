import { aiGenerationEvents } from "../../ai/events/schema"
import { addJobs } from "../../chat/add/jobs/schema"
import { addPlans } from "../../chat/add/plans/schema"
import { conversations } from "../../chat/conversations/schema"
import { chatMessages } from "../../chat/messages/schema"
import { externalResources } from "./external-resources/schema"

const schema = {
    aiGenerationEvents,
    addPlans,
    addJobs,
    conversations,
    chatMessages,
    externalResources
}

export { schema }
