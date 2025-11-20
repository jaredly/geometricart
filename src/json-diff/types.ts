/**
 * Strongly-typed JSON Patch support for a given TypeScript type.
 *
 * Features:
 * - Path<T>: all valid JSON Pointer paths into T (plus "" for the root).
 * - PathValue<T, P>: the type located at path P.
 * - RemovablePath<T, C>: only paths that are safe to remove (optional / nullable / array elements).
 * - JsonPatch<T, C>: RFC 6902-style operations, type-checked against T.
 *
 * Configuration:
 *   JsonPatchConfig:
 *     - arrays: "elements-removable" | "no-remove"
 *         "elements-removable" → allow removing array elements (/items/0)
 *         "no-remove"          → disallow removing array elements
 *
 *     - nullRemoval: "allow" | "disallow"
 *         "allow"    → paths whose property type includes `null` are removable
 *         "disallow" → null alone doesn't make a property removable
 *
 *     - addDash: "allow" | "disallow"
 *         "allow"    → allow `/-` to append to arrays (RFC 6902)
 *         "disallow" → forbid `/-` paths
 */

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

export interface JsonPatchConfig {
    arrays?: 'elements-removable' | 'no-remove';
    nullRemoval?: 'allow' | 'disallow';
    addDash?: 'allow' | 'disallow';
}

export type DefaultJsonPatchConfig = {
    arrays: 'elements-removable';
    nullRemoval: 'disallow';
    addDash: 'allow';
};

type NormalizeConfig<C extends JsonPatchConfig> = {
    arrays: C['arrays'] extends 'elements-removable' | 'no-remove'
        ? C['arrays']
        : DefaultJsonPatchConfig['arrays'];
    nullRemoval: C['nullRemoval'] extends 'allow' | 'disallow'
        ? C['nullRemoval']
        : DefaultJsonPatchConfig['nullRemoval'];
    addDash: C['addDash'] extends 'allow' | 'disallow'
        ? C['addDash']
        : DefaultJsonPatchConfig['addDash'];
};

type ArraysAreRemovable<C extends JsonPatchConfig> =
    NormalizeConfig<C>['arrays'] extends 'elements-removable' ? true : false;

type NullsAreRemovable<C extends JsonPatchConfig> =
    NormalizeConfig<C>['nullRemoval'] extends 'allow' ? true : false;

type AddDashAllowed<C extends JsonPatchConfig> = NormalizeConfig<C>['addDash'] extends 'allow'
    ? true
    : false;

/* -------------------------------------------------------------------------- */
/*  Utility types                                                             */
/* -------------------------------------------------------------------------- */

/** Does T have a string index signature? (i.e., Record<string, ...>) */
type HasStringIndex<T> = T extends {[k: string]: any}
    ? string extends keyof T
        ? true
        : false
    : false;

/** Value type of a string index signature on T (if any). */
type StringIndexValue<T> = T extends {[k: string]: infer V} ? V : never;

type Elem<T> = T extends (infer U)[] ? U : never;

/** Optional keys of an object type */
type OptionalKeys<T extends object> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/** Is key K optional in T? */
type IsOptionalKey<T extends object, K extends keyof T> = K extends OptionalKeys<T> ? true : false;

/** Can property T[K] be removed under config C? */
type IsRemovableProperty<
    T extends object,
    K extends keyof T,
    C extends JsonPatchConfig,
> = IsOptionalKey<T, K> extends true // Optional properties are always removable
    ? true
    : // Nullable properties optionally removable
      NullsAreRemovable<C> extends true
      ? null extends T[K]
          ? true
          : false
      : false;

/* -------------------------------------------------------------------------- */
/*  Path<T> – all JSON Pointer paths into T                                   */
/* -------------------------------------------------------------------------- */

/**
 * Internal recursive path builder.
 *
 * Prefix is the JSON Pointer path to the current T.
 */
type PathImpl<T, Prefix extends string> = T extends (infer U)[]
    ? // array elements: /.../0, /.../1, ...
      `${Prefix}/${number}` | PathImpl<U, `${Prefix}/${number}`>
    : T extends object
      ? {
            [K in keyof T & (string | number)]: `${Prefix}/${K}` | PathImpl<T[K], `${Prefix}/${K}`>;
        }[keyof T & (string | number)]
      : never;

/**
 * All JSON Pointer paths into T.
 *
 * Includes:
 *   ""           → root
 *   "/foo"       → property foo
 *   "/foo/bar"   → nested
 *   "/items/0"   → array elements
 */
export type Path<T> = '' | PathImpl<T, ''>;

/* -------------------------------------------------------------------------- */
/*  PathValue<T, P> – value type at a given path                              */
/* -------------------------------------------------------------------------- */

type PathValueImpl<T, P extends string> = P extends '' // Root
    ? T
    : // "/head/rest"
      P extends `/${infer Head}/${infer Rest}`
      ? T extends (infer U)[]
          ? Head extends `${number}`
              ? PathValueImpl<U, `/${Rest}`>
              : never
          : T extends object
            ? Head extends keyof T
                ? PathValueImpl<T[Head], `/${Rest}`>
                : never
            : never
      : // "/last"
        P extends `/${infer Last}`
        ? T extends (infer U)[]
            ? Last extends `${number}`
                ? U
                : never
            : T extends object
              ? Last extends keyof T
                  ? T[Last]
                  : never
              : never
        : never;

/** The type located at JSON Pointer path P within T. */
export type PathValue<T, P extends string> = PathValueImpl<T, P>;

/* -------------------------------------------------------------------------- */
/*  Array container paths for `/-` support                                    */
/* -------------------------------------------------------------------------- */

/**
 * Paths whose value is an array.
 *
 * When used with `/-`, represent "append to this array".
 */
type ArrayContainerPathImpl<T, Prefix extends string> = T extends (infer U)[]
    ? // This location is an array
      Prefix | ArrayContainerPathImpl<U, `${Prefix}/${number}`>
    : T extends object
      ? {
            [K in keyof T & (string | number)]: ArrayContainerPathImpl<T[K], `${Prefix}/${K}`>;
        }[keyof T & (string | number)]
      : never;

type ArrayContainerPath<T> = ArrayContainerPathImpl<T, ''>;

/** Paths that end with "/-" to append to arrays. */
type AddArrayEndPath<T, C extends JsonPatchConfig> = AddDashAllowed<C> extends true
    ? ArrayContainerPath<T> extends infer P extends string
        ? `${P}/-`
        : never
    : never;

// /** Valid `path` values for an "add" op (normal paths + `/-` for arrays). */
// export type AddPath<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> =
//     | Path<T>
//     | AddArrayEndPath<T, C>;

/**
 * Paths where you can "add" an element into an array (insert at index).
 * Produces all `${arrayPath}/${number}` combinations.
 */
type AddArrayIndexPathImpl<T, Prefix extends string> = T extends (infer U)[]
    ? `${Prefix}/${number}` | AddArrayIndexPathImpl<U, `${Prefix}/${number}`>
    : T extends object
      ? {
            [K in keyof T & (string | number)]: AddArrayIndexPathImpl<T[K], `${Prefix}/${K}`>;
        }[keyof T & (string | number)]
      : never;

type AddArrayIndexPath<T> = AddArrayIndexPathImpl<T, ''>;

/** Valid `path`s for an "add" op:
 *  – adding into Record-like types
 *  – or appending to arrays with "/-"
 */
export type AddPath<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> =
    | AddRecordPath<T>
    | AddArrayIndexPath<T>
    | AddArrayEndPath<T, C>;

// /** Value type for an "add" op at path P. */
// export type AddPathValue<T, P extends string> = P extends `${
//     infer Base // "/something/-" → element type of the array at "/something"
// }/-`
//     ? PathValue<T, Base> extends (infer U)[]
//         ? U
//         : never
//     : PathValue<T, P>;

/** Value type for an "add" op at path P. */
export type AddPathValue<T, P extends string> = P extends `${
    infer Base // "/something/-" → element type of the array at "/something"
}/-`
    ? PathValue<T, Base> extends (infer U)[]
        ? U
        : never
    : // "/parent/key"
      P extends `${infer Parent}/${infer Key}`
      ? PathValue<T, Parent> extends (infer U)[]
          ? // parent is array → adding element
            U
          : HasStringIndex<PathValue<T, Parent>> extends true
            ? // parent is Record-like → string-index value
              StringIndexValue<PathValue<T, Parent>>
            : // fallback (shouldn't normally happen for AddPath)
              PathValue<T, P>
      : never;

// /** Value type for an "add" op at path P. */
// type AddPathValue<T, P extends string> = P extends `${
//     infer Base // "/something/-" → element type of the array at "/something"
// }/-`
//     ? PathValue<T, Base> extends (infer U)[]
//         ? U
//         : never
//     : PathValue<T, P>;

/**
 * Paths where you can "add" into a Record-like object:
 * – parent has a string index signature
 * – you may add a new key: `${Prefix}/${string}`
 * – recursion continues into the value type.
 */
type AddRecordPathImpl<T, Prefix extends string> = T extends object
    ? // Recurse through known properties
          | {
                [K in keyof T & (string | number)]: AddRecordPathImpl<T[K], `${Prefix}/${K}`>;
            }[keyof T & (string | number)]
          // If this node has a string index signature, we can add arbitrary keys here
          | (HasStringIndex<T> extends true ? `${Prefix}/${string}` : never)
    : never;

/** All JSON Pointer paths where `add` is allowed due to Record<string, V>. */
type AddRecordPath<T> = AddRecordPathImpl<T, ''>;

/* -------------------------------------------------------------------------- */
/*  RemovablePath<T, C> – where `remove` is allowed                           */
/* -------------------------------------------------------------------------- */

/**
 * Internal recursive builder for removable paths:
 * - optional properties always removable
 * - nullable properties removable depending on config
 * - array elements removable depending on config
 */
type RemovablePathImpl<T, Prefix extends string, C extends JsonPatchConfig> = T extends (infer U)[]
    ? ArraysAreRemovable<C> extends true
        ? `${Prefix}/${number}` | RemovablePathImpl<U, `${Prefix}/${number}`, C>
        : RemovablePathImpl<U, `${Prefix}/${number}`, C>
    : T extends object
      ? {
            [K in keyof T & (string | number)]: IsRemovableProperty<T, K & keyof T, C> extends true
                ? `${Prefix}/${K}` | RemovablePathImpl<T[K], `${Prefix}/${K}`, C>
                : RemovablePathImpl<T[K], `${Prefix}/${K}`, C>;
        }[keyof T & (string | number)]
      : never;

/** All paths where a JSON Patch `remove` is allowed for T under config C. */
export type RemovablePath<
    T,
    C extends JsonPatchConfig = DefaultJsonPatchConfig,
> = RemovablePathImpl<T, '', C>;

/* -------------------------------------------------------------------------- */
/*  JSON Patch operation types                                                */
/* -------------------------------------------------------------------------- */

/** "add" operation – `path` & `value` are coupled and type-safe. */

export type AddOpForPath<T, P extends AddPath<T>> = {
    op: 'add';
    path: P;
    value: AddPathValue<T, P>;
    context?: any;
};

export type AddOp<T> = AddOpForPath<T, AddPath<T>>;

/** "replace" operation. */
export type ReplaceOpForPath<T, P extends Path<T>> = {
    op: 'replace';
    path: P;
    value: PathValue<T, P>;
    previous: PathValue<T, P>;
    context?: any;
};

/** "replace" operation. */
// export type ReplaceOp<T> = {
//     [P in Path<T>]: {
//         op: 'replace';
//         path: P;
//         value: PathValue<T, P>;
//         previous: PathValue<T, P>;
//         context?: any;
//     };
// }[Path<T>];
export type ReplaceOp<T> = ReplaceOpForPath<T, Path<T>>;

/** "test" operation. */
export type TestOp<T> = {
    [P in Path<T>]: {
        op: 'test';
        path: P;
        value: PathValue<T, P>;
        context?: any;
    };
}[Path<T>];

export type RemoveOp<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> = RemoveOpForPath<
    T,
    C,
    RemovablePath<T, C>
>;

/** "remove" operation – only allowed at RemovablePath<T, C>. */
export type RemoveOpForPath<T, C extends JsonPatchConfig, P extends RemovablePath<T, C>> = {
    op: 'remove';
    path: P;
    value: PathValue<T, P>;
    context?: any;
};

/** "move" operation. (No extra type coupling beyond valid paths.) */
export type MoveOp<T> = {
    op: 'move';
    from: Path<T>;
    path: Path<T>;
    context?: any;
};

/** "copy" operation. */
export type CopyOp<T> = {
    op: 'copy';
    from: Path<T>;
    path: Path<T>;
    context?: any;
};

/** Union of all patch operations for T, with optional config C. */
export type JsonPatchOp<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> =
    | AddOp<T>
    | ReplaceOp<T>
    | TestOp<T>
    | RemoveOp<T, C>
    | MoveOp<T>
    | CopyOp<T>;

/** A full JSON Patch document. */
export type JsonPatch<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> = JsonPatchOp<T, C>[];

/* -------------------------------------------------------------------------- */
/*  Example usage                                                             */
/* -------------------------------------------------------------------------- */

// Example model type
interface User {
    id: string; // required: NOT removable
    name?: string; // optional: removable
    email: string | null; // required + nullable: removable only if nullRemoval = "allow"
    tags: string[]; // array: elements removable if arrays = "elements-removable"
    address?: {
        city: string; // required (inside optional object): NOT removable
        zip?: number; // optional: removable
    };
}

// Default config:
//   - array elements removable
//   - null alone does NOT make a property removable
//   - "/-" allowed for add
const patch1: JsonPatch<User> = [
    {op: 'replace', path: '/id', value: 'abc', previous: 'lol'}, // ok
    {op: 'remove', path: '/name', value: 'lol'}, // ok (optional)
    {op: 'add', path: '/tags/10', value: 'vip'}, // ok (string[])
    {op: 'add', path: '/tags/-', value: 'new'}, // ok (append to array)
    {op: 'remove', path: '/tags/0', value: 'a'}, // ok (array elements removable by default)
    {op: 'remove', path: '/address/zip', value: 12}, // ok (optional)
    // { op: "remove", path: "/id" },              // ❌ error: "/id" is not RemovablePath<User>
    // { op: "remove", path: "/address/city" },    // ❌ error: required, not removable
];
