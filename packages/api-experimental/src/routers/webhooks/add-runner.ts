import { processAddRunnerWebhook } from "@altered/server-experimental/chat/add/webhook"
import { Hono } from "hono"

const app = new Hono()

app.post("/", context => processAddRunnerWebhook(context.req.raw))

export { app as addRunnerWebhookRouter }
