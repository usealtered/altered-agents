#!/usr/bin/env node

import { execSync } from "node:child_process"

function run(command) {
    return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim()
}

function runStreaming(command) {
    execSync(command, { stdio: "inherit" })
}

function assertAgentBranch(branchName) {
    if (branchName === "main" || branchName.startsWith("job-")) return

    throw new Error(
        `Refusing to sync from out-of-scope branch: ${branchName}. Switch to main or job-* first.`
    )
}

function main() {
    const branch = run("git branch --show-current")
    assertAgentBranch(branch)

    console.log(`Syncing branch: ${branch}`)

    runStreaming("git fetch origin main")
    runStreaming("git rebase origin/main")

    console.log("Sync complete.")
}

main()
