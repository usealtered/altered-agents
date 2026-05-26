type ScopeCheckResult = { ok: true } | { ok: false; reason: string }

const DEFAULT_ALLOWED_REPOSITORY = "usealtered/altered"

function getConfiguredAllowedRepository(): string {
    return (
        process.env.ADD_ALLOWED_GITHUB_REPOSITORY?.trim() ||
        DEFAULT_ALLOWED_REPOSITORY
    )
}

function getConfiguredAllowedDomainSuffixes(): string[] {
    return (process.env.ADD_ALLOWED_DOMAIN_SUFFIXES ?? "")
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean)
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

function ensureAllowedRunnerUrl(url: string): ScopeCheckResult {
    const configuredSuffixes = getConfiguredAllowedDomainSuffixes()

    if (configuredSuffixes.length === 0) return { ok: true }

    const hostname = new URL(url).hostname.toLowerCase()
    const isAllowed = configuredSuffixes.some(
        suffix => hostname === suffix || hostname.endsWith(`.${suffix}`)
    )

    if (isAllowed) return { ok: true }

    return {
        ok: false,
        reason: `Runner URL domain is outside allowed scope: ${hostname}.`
    }
}

export { ensureAllowedBranch, ensureAllowedRepository, ensureAllowedRunnerUrl }
