#!/usr/bin/env tsx

import { parseArgs } from "node:util"
import { cleanPackage } from "../src/clean/package"

const { values } = parseArgs({
    options: {
        workspace: { type: "boolean", short: "w" }
    }
})

cleanPackage({ isMonorepoRoot: values.workspace })
