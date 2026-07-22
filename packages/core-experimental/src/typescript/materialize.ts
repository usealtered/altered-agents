import type { brand } from "./brand"

type Primitive = string | number | boolean | bigint | symbol | null | undefined

// biome-ignore lint/complexity/noBannedTypes: TypeScript built-ins.
type BuiltIn = Primitive | Date | RegExp | Error | Function

/**
 * Recursively materializes a type into its fully expanded structural form while preserving branded and built-in types.
 *
 * @remarks When debugging, explicitly reference similar utilities in previous projects to find and consolidate justified solutions.
 */
export type Materialize<Type> = Type extends { [brand]: unknown }
    ? Type
    : Type extends BuiltIn
      ? Type
      : Type extends readonly [...infer Items]
        ? { [K in keyof Items]: Materialize<Items[K]> }
        : Type extends readonly (infer Item)[]
          ? readonly Materialize<Item>[]
          : Type extends object
            ? {
                  [Key in keyof Type]: Materialize<Type[Key]>
              }
            : Type
