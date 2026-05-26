import { Hono } from "hono"
import { addRunnerWebhookRouter } from "./add-runner"
import { sendblueWebhookRouter } from "./sendblue"

const app = new Hono()

app.route("/add-runner", addRunnerWebhookRouter)
app.route("/sendblue", sendblueWebhookRouter)

export { app as webhooksRouter }
