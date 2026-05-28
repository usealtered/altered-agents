import { build } from "esbuild"

const matchAllPattern = /.*/

function shouldExternalize(specifier) {
    if (
        specifier.startsWith(".") ||
        specifier.startsWith("/") ||
        specifier.startsWith("node:")
    )
        return false

    if (specifier.startsWith("@altered/")) return false

    return true
}

await build({
    absWorkingDir: process.cwd(),
    entryPoints: ["src/index.ts"],
    outfile: "dist/index.js",
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    conditions: ["bundler"],
    plugins: [
        {
            name: "externalize-non-altered-packages",
            setup(currentBuild) {
                currentBuild.onResolve({ filter: matchAllPattern }, args => {
                    if (!shouldExternalize(args.path)) return null

                    return { path: args.path, external: true }
                })
            }
        }
    ]
})
