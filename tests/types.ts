/**
 * Construct a type with the keys of T and its nested objects, but apply custom type values
 */
export type StructureOf<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? StructureOf<U>[]
        : T[P] extends Record<string, any>
        ? StructureOf<T[P]>
        : T[any];
};
