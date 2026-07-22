#!/usr/bin/env tsx

import { parseArgs } from "node:util"
import { bundleApplication } from "../src/build/bundle-application"

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        include: { type: "string", multiple: true, short: "i" },
        outfile: { type: "string", short: "o" }
    }
})

const entrypoint = positionals[0]
const include = values.include
const outfile = values.outfile

await bundleApplication({ entrypoint, include, outfile })
