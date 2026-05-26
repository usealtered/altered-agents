#!/usr/bin/env node

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const REQUIRED_FILES = [
    ".env.agents",
    ".context/_generated/plans/agents-add-orchestrator-detailed.md"
]

const REQUIRED_ENV_KEYS = [
    "SHARED_CONFIG_ENV",
    "SHARED_STORAGE_DATABASE_URL",
    "SHARED_STORAGE_KV_URL",
    "SHARED_PROVIDER_SENDBLUE_PUBLIC",
    "SHARED_PROVIDER_SENDBLUE_SECRET",
    "SHARED_PROVIDER_SENDBLUE_SIGNING",
    "SHARED_PROVIDER_SENDBLUE_NUMBER",
    "SHARED_PROVIDER_OPENROUTER_SECRET",
    "ADD_TARGET_GITHUB_REPOSITORY"
]

function run(command) {
    return execSync(command, { encoding: "utf8", stdio: "pipe" }).trim()
}

function fail(message) {
    console.error(`Preflight failed: ${message}`)
    process.exit(1)
}

function checkRequiredFiles() {
    for (const relativePath of REQUIRED_FILES) {
        if (!existsSync(resolve(process.cwd(), relativePath)))
            fail(`Missing required file: ${relativePath}`)
    }
}

function checkBranchScope() {
    const branch = run("git branch --show-current")
    if (!branch.startsWith("agents/"))
        fail(`Current branch is outside agents/* scope: ${branch}`)
}

function checkRemote() {
    const remote = run("git remote get-url origin")
    if (!remote.includes("usealtered/altered"))
        fail(
            `Origin remote is not set to usealtered/altered (current: ${remote})`
        )
}

function parseEnvAgents() {
    const filePath = resolve(process.cwd(), ".env.agents")
    const raw = readFileSync(filePath, "utf8")

    const map = new Map()

    for (const line of raw.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue

        const equalsIndex = trimmed.indexOf("=")
        if (equalsIndex === -1) continue

        const key = trimmed.slice(0, equalsIndex).trim()
        const value = trimmed.slice(equalsIndex + 1).trim()
        map.set(key, value)
    }

    return map
}

function checkRequiredEnvKeys() {
    const envMap = parseEnvAgents()

    for (const key of REQUIRED_ENV_KEYS) {
        const value = envMap.get(key)
        if (!value) fail(`Missing required key in .env.agents: ${key}`)
    }
}

function main() {
    checkRequiredFiles()
    checkBranchScope()
    checkRemote()
    checkRequiredEnvKeys()

    console.log("ADD preflight passed.")
}

main()
