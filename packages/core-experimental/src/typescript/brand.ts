export declare const brand: unique symbol

export type Brand<Type, Name> = Type & { [brand]: Name }
