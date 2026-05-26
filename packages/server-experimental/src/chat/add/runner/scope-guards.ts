type ScopeCheckResult = { ok: true } | { ok: false; reason: string }

const DEFAULT_ALLOWED_REPOSITORY = "usealtered/altered"

function getConfiguredAllowedRepository(): string {
    return (
        process.env.ADD_ALLOWED_GITHUB_REPOSITORY?.trim() ||
        DEFAULT_ALLOWED_REPOSITORY
    )
}

function ensureAllowedRepository(repository: string): ScopeCheckResult {
    const allowedRepository = getConfiguredAllowedRepository()

    if (repository === allowedRepository) return { ok: true }

    return {
        ok: false,
        reason: `Repository outside allowed scope: ${repository}. Allowed: ${allowedRepository}.`
    }
}

function ensureAllowedBranch(branchName: string): ScopeCheckResult {
    if (branchName.startsWith("agents/")) return { ok: true }

    return {
        ok: false,
        reason: `Branch outside allowed scope: ${branchName}.`
    }
}

export { ensureAllowedBranch, ensureAllowedRepository }
