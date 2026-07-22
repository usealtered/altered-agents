import { constructPrompts } from "../../../../../ai/prompts/constructor"
import {
    createEphemeralEnvironmentSystemPrompt,
    ENVIRONMENT_SYSTEM_PROMPT
} from "../../../../../ai/prompts/environment"
import { IDENTITY_SYSTEM_PROMPT } from "../../../../../ai/prompts/identity"
import { IMESSAGE_SYSTEM_PROMPT } from "./prompt"

function composeSystemPrompt(): {
    initial: string
    ephemeral: string
} {
    return {
        initial: constructPrompts([
            IDENTITY_SYSTEM_PROMPT,
            ENVIRONMENT_SYSTEM_PROMPT,
            IMESSAGE_SYSTEM_PROMPT
        ]),

        ephemeral: constructPrompts(
            [createEphemeralEnvironmentSystemPrompt()],
            { delimiter: "; " }
        )
    }
}

export { composeSystemPrompt }
