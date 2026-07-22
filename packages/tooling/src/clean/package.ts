import { spawnSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { join } from "node:path"

/**
 * Removes all uncontrolled artifacts from a package directory.
 */
function cleanPackage(options?: {
    /**
     * The package directory to clean.
     */
    workingDirectory?: string

    /**
     * Runs `turbo clean` for sub-packages before cleaning.
     */
    isMonorepoRoot?: boolean

    /**
     * Paths to remove. `node_modules` uses recursive delete; others use `git clean -xdf`.
     */
    removePaths?: string[]
}) {
    const { workingDirectory, isMonorepoRoot, removePaths } = {
        ...options,

        workingDirectory: options?.workingDirectory ?? process.cwd(),
        isMonorepoRoot: options?.isMonorepoRoot ?? false,
        removePaths: options?.removePaths ?? [
            ".cache",
            ".turbo",
            "dist",
            "node_modules"
        ]
    }

    if (isMonorepoRoot) {
        const turbo = spawnSync("pnpm", ["exec", "turbo", "clean"], {
            stdio: "inherit",
            cwd: workingDirectory
        })

        if (turbo.status !== 0) process.exit(turbo.status ?? 1)
    }

    const nodeModulesPaths = removePaths.filter(path => path === "node_modules")
    const gitPaths = removePaths.filter(path => path !== "node_modules")

    for (const path of nodeModulesPaths) {
        const absolutePath = join(workingDirectory, path)

        if (!existsSync(absolutePath)) continue

        console.log(`Removing ${path}/`)

        rmSync(absolutePath, { recursive: true, force: true })
    }

    if (gitPaths.length === 0) return

    const git = spawnSync("git", ["clean", "-xdf", ...gitPaths], {
        stdio: "inherit",
        cwd: workingDirectory
    })

    process.exit(git.status ?? 1)
}

export { cleanPackage }
