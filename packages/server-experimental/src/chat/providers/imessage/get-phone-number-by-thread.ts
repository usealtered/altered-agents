import { getAlteredChat } from "../../instance"

function getImessagePhoneNumberByThread(id: string): string | null {
    const chat = getAlteredChat()
    const adapter = chat.getAdapter("sendblue")

    return adapter.decodeThreadId(id).contactNumber ?? null
}

export { getImessagePhoneNumberByThread }
