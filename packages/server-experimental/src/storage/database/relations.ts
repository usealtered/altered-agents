import { defineRelations } from "drizzle-orm"
import { schema } from "./schema"

const relations = defineRelations(schema, r => ({
    aiGenerationEvents: {
        conversation: r.one.conversations({
            from: r.aiGenerationEvents.conversationId,
            to: r.conversations.id
        })
    },

    addPlans: {
        conversation: r.one.conversations({
            from: r.addPlans.conversationId,
            to: r.conversations.id
        }),
        jobs: r.many.addJobs({
            from: r.addPlans.id,
            to: r.addJobs.planId
        })
    },

    addJobs: {
        plan: r.one.addPlans({
            from: r.addJobs.planId,
            to: r.addPlans.id
        })
    },

    conversations: {
        aiGenerationEvents: r.many.aiGenerationEvents({
            from: r.conversations.id,
            to: r.aiGenerationEvents.conversationId
        }),
        addPlans: r.many.addPlans({
            from: r.conversations.id,
            to: r.addPlans.conversationId
        }),
        chatMessages: r.many.chatMessages({
            from: r.conversations.id,
            to: r.chatMessages.conversationId
        }),
        externalResources: r.many.externalResources({
            from: r.conversations.id,
            to: r.externalResources.conversationId
        })
    },

    chatMessages: {
        conversation: r.one.conversations({
            from: r.chatMessages.conversationId,
            to: r.conversations.id
        }),
        externalResources: r.many.externalResources({
            from: r.chatMessages.id,
            to: r.externalResources.messageId
        })
    },

    externalResources: {
        conversation: r.one.conversations({
            from: r.externalResources.conversationId,
            to: r.conversations.id
        }),
        message: r.one.chatMessages({
            from: r.externalResources.messageId,
            to: r.chatMessages.id
        })
    }
}))

export { relations }
