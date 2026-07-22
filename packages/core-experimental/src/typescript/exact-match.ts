import type { Materialize } from "./materialize"

/**
 * Resolves to `true` when `First` and `Second` are structurally identical, and `false` otherwise. For deeper diagnostics, use {@link AssertExactMatch}.
 *
 * @remarks
 * - Using a "function type instantiation" strategy to compare the internal type identity helps us catch optional property differences that would be missed by a mutual assignability check.
 * - This is primarily used to detect drift between two types. To cause a TypeScript error when this happens, assign this type to a value of `true`. To enforce intentional inequality instead, assign to `false`.
 *
 * @example ```ts
 * const _integrityCheck: IsExactMatch<Foo, Bar> = true
 * ```
 */
export type IsExactMatch<First, Second> =
    (<Phantom>() => Phantom extends First ? 1 : 2) extends <
        Phantom
    >() => Phantom extends Second ? 1 : 2
        ? true
        : false

/**
 * Like {@link IsExactMatch}, but encodes the `Expected` and `Actual` shapes in the error message.
 *
 * @example ```ts
 * const _integrityCheck: AssertExactMatch<Foo, Bar> = true
 * ```
 */
export type AssertExactMatch<Expected, Actual> =
    IsExactMatch<Expected, Actual> extends true
        ? true
        : "`AssertExactMatch<Expected, Actual>`, where `Expected` and `Actual` are not an exact match" &
              Materialize<{
                  expected: Expected
                  actual: Actual
              }>
