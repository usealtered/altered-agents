import type { AddRunner } from "./types"

function isLocalRunnerEnabled(): boolean {
    return process.env.ADD_USE_LOCAL_TEST_RUNNER === "1"
}

const localTestRunner: AddRunner = {
    execute(input) {
        return Promise.resolve({
            status: "completed",
            notes: [
                "Local test runner executed.",
                `Simulated branch target: ${input.branchName}.`
            ],
            metadata: {
                mode: "local-test-runner",
                simulated: true,
                costUsd: 0
            }
        })
    }
}

export { isLocalRunnerEnabled, localTestRunner }
