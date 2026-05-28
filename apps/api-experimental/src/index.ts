import ALTEREDAPI from "@altered/api-experimental"
import { Hono } from "hono"

const app = new ALTEREDAPI()

//  A Hono import is required by Vercel to satisfy its framework detection logic.
if (!(app instanceof Hono)) throw new Error("'ALTEREDAPI' must extend 'Hono'.")

//  TODO P0: Implement with Effect.

const isVercel = process.env.VERCEL === "1"
if (!isVercel) void app.serve()

export default app
