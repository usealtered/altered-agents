#!/usr/bin/env node

import {
    ensureAllowedBranch,
    ensureAllowedRepository
} from "../../packages/server-experimental/src/chat/add/runner/scope-guards.ts"
import { resolveExecutionMode } from "../../trigger/lib/execution-mode.ts"

type TestCase = {
    name: string
    run: () => void
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message)
}

const executionModeCases: TestCase[] = [
    {
        name: "defaults to noop when payload and env are absent",
        run: () => {
            const outcome = resolveExecutionMode({})

            assert(outcome.kind === "noop", "Expected noop default.")
        }
    },
    {
        name: "uses env mode when payload mode is absent",
        run: () => {
            const outcome = resolveExecutionMode({ envMode: "repo-write" })

            assert(
                outcome.kind === "repo-write",
                "Expected repo-write from env."
            )
        }
    },
    {
        name: "payload mode overrides env mode",
        run: () => {
            const outcome = resolveExecutionMode({
                payloadMode: "noop",
                envMode: "repo-write"
            })

            assert(outcome.kind === "noop", "Expected payload mode to win.")
        }
    },
    {
        name: "trims whitespace from payload mode",
        run: () => {
            const outcome = resolveExecutionMode({
                payloadMode: "  repo-write  "
            })

            assert(
                outcome.kind === "repo-write",
                "Expected trimmed repo-write."
            )
        }
    },
    {
        name: "blocks unsupported execution modes",
        run: () => {
            const outcome = resolveExecutionMode({ payloadMode: "sandbox" })

            assert(
                outcome.kind === "unsupported" && outcome.mode === "sandbox",
                "Expected unsupported sandbox mode."
            )
        }
    }
]

const scopeGuardCases: TestCase[] = [
    {
        name: "allows main branch",
        run: () => {
            const result = ensureAllowedBranch("main")

            assert(result.ok, "Expected main branch to be allowed.")
        }
    },
    {
        name: "allows job-* branches",
        run: () => {
            const result = ensureAllowedBranch("job-e2e-k92_ahpD")

            assert(result.ok, "Expected job branch to be allowed.")
        }
    },
    {
        name: "blocks human feature branches",
        run: () => {
            const result = ensureAllowedBranch("feat/imessage-server-poc")

            assert(!result.ok, "Expected human branch to be blocked.")
        }
    },
    {
        name: "allows configured repository",
        run: () => {
            const previous = process.env.ADD_ALLOWED_GITHUB_REPOSITORY
            process.env.ADD_ALLOWED_GITHUB_REPOSITORY =
                "usealtered/altered-agents"

            try {
                const result = ensureAllowedRepository(
                    "usealtered/altered-agents"
                )

                assert(
                    result.ok,
                    "Expected configured repository to be allowed."
                )
            } finally {
                if (previous === undefined)
                    delete process.env.ADD_ALLOWED_GITHUB_REPOSITORY
                else process.env.ADD_ALLOWED_GITHUB_REPOSITORY = previous
            }
        }
    }
]

function runCases(label: string, cases: TestCase[]) {
    for (const testCase of cases) {
        testCase.run()

        console.log(`  ok  ${label} :: ${testCase.name}`)
    }
}

function main() {
    console.log("ADD trigger execution mode E2E validation")

    runCases("execution-mode", executionModeCases)
    runCases("scope-guards", scopeGuardCases)

    console.log("")
    console.log("All ADD trigger execution mode checks passed.")
}

main()
