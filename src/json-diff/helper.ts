import {make} from './make';
import {
    AddOpForPath,
    AddPath,
    AddPathValue,
    ArrayContainerPath,
    DefaultJsonPatchConfig,
    JsonPatchConfig,
    JsonPatchOp,
    Path,
    PathValue,
    PendingJsonPatchOp,
    RemovablePath,
    RemoveOpForPath,
    ReplaceOpForPath,
} from './types';

// Always allowed on valid paths
type ReplaceAndTestMethods<Root, P extends Path<Root>> = {
    replace(value: PathValue<Root, P>): ReplaceOpForPath<Root, P>;
};

// Only if P is an AddPath<Root, C>
type AddMethods<Root, P extends string, C extends JsonPatchConfig> = P extends AddPath<Root, C>
    ? {
          add(value: AddPathValue<Root, P>): AddOpForPath<Root, P>;
      }
    : {};

// Only if P is a RemovablePath<Root, C>
type RemoveMethods<Root, P extends string, C extends JsonPatchConfig> = P extends RemovablePath<
    Root,
    C
>
    ? {remove(): RemoveOpForPath<Root, C, P>}
    : {};

// export type DiffNode<
//     Root,
//     Current,
//     P extends Path<Root>,
//     C extends JsonPatchConfig,
// > = ReplaceAndTestMethods<Root, P> & // operations at the current path
//     AddMethods<Root, P, C> &
//     RemoveMethods<Root, P, C> &
//     // navigation
//     // Arrays → numeric index navigation
//     (Current extends (infer Elem)[]
//         ? {
//               [K in number]: DiffNode<
//                   Root,
//                   Elem,
//                   `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
//                   C
//               >;
//           }
//         : // Objects → property navigation
//           Current extends object
//           ? {
//                 [K in keyof NonNullable<Current> & (string | number)]: DiffNode<
//                     Root,
//                     Current[K],
//                     `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
//                     C
//                 >;
//             } & (string extends keyof Current // Index signature support, e.g. Record<string, V>
//                 ? {
//                       [key: string]: DiffNode<
//                           Root,
//                           Current[string],
//                           `${P}/${string}` extends Path<Root> ? `${P}/${string}` : never,
//                           C
//                       >;
//                   }
//                 : {})
//           : {});

// Root builder type
// export type DiffBuilder<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> = DiffNode<
//     T,
//     T,
//     '',
//     C
// >;

// export function diffBuilder<T, C extends JsonPatchConfig = DefaultJsonPatchConfig>(
//     current: () => T,
// ): DiffBuilder<T, C> {
//     function makeProxy(pathSegments: Array<string | number>): any {
//         const handler: ProxyHandler<any> = {
//             get(_target, prop, _receiver) {
//                 // Operation handlers
//                 if (prop === 'replace') {
//                     return (value: any) => {
//                         const path =
//                             pathSegments.length === 0
//                                 ? '' // root replace
//                                 : '/' + pathSegments.map(String).join('/');

//                         return make.replace(current(), path as Path<T>, value);
//                     };
//                 }

//                 if (prop === 'add') {
//                     return (value: any): AddOpForPath<T, any> => {
//                         const path =
//                             pathSegments.length === 0
//                                 ? ''
//                                 : '/' + pathSegments.map(String).join('/');

//                         return make.add(current(), path as AddPath<T>, value);
//                     };
//                 }

//                 if (prop === 'remove') {
//                     return (): RemoveOpForPath<T, C, any> => {
//                         const path =
//                             pathSegments.length === 0
//                                 ? ''
//                                 : '/' + pathSegments.map(String).join('/');

//                         return make.remove(current(), path as RemovablePath<T>);
//                     };
//                 }

//                 // Ignore symbols (e.g. util.inspect.custom)
//                 if (typeof prop === 'symbol') {
//                     return undefined;
//                 }

//                 // Descend: property or numeric index
//                 const key =
//                     typeof prop === 'string' && /^\d+$/.test(prop)
//                         ? Number(prop)
//                         : (prop as string | number);

//                 return makeProxy([...pathSegments, key]);
//             },
//         };

//         return new Proxy({}, handler);
//     }

//     return makeProxy([]) as DiffBuilder<T, C>;
// }

type ReplaceAndTestMethodsA<Root, P extends Path<Root>> = {
    replace(value: PathValue<Root, P>): void;
};

// Only if P is an AddPath<Root, C>
type AddMethodsA<Root, P extends string, C extends JsonPatchConfig> = P extends AddPath<Root, C>
    ? {add(value: AddPathValue<Root, P>): void}
    : {};

// Only if P is a RemovablePath<Root, C>
type RemoveMethodsA<Root, P extends string, C extends JsonPatchConfig> = P extends RemovablePath<
    Root,
    C
>
    ? {remove(): void}
    : {};

// export type DiffNodeA<
//     Root,
//     Current,
//     P extends Path<Root>,
//     C extends JsonPatchConfig,
// > = ReplaceAndTestMethodsA<Root, P> & // operations at the current path
//     AddMethodsA<Root, P, C> &
//     RemoveMethodsA<Root, P, C> &
//     // navigation
//     // Arrays → numeric index navigation
//     (Current extends (infer Elem)[]
//         ? {
//               [K in number]: DiffNodeA<
//                   Root,
//                   Elem,
//                   `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
//                   C
//               >;
//           } & {
//               push(value: Elem): void;
//               move(from: number, to: number): void;
//               reorder(indices: number[]): void;
//           }
//         : // Objects → property navigation
//           Current extends object
//           ? {
//                 [K in keyof Current & (string | number)]: DiffNodeA<
//                     Root,
//                     Current[K] & {},
//                     `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
//                     C
//                 >;
//             } & (string extends keyof Current // Index signature support, e.g. Record<string, V>
//                 ? {
//                       [Key in keyof Current & string]: DiffNodeA<
//                           Root,
//                           Current[Key] & {},
//                           `${P}/${Key}` extends Path<Root> ? `${P}/${Key}` : never,
//                           C
//                       >;
//                   }
//                 : {})
//           : {});

// // Root builder type
// export type DiffBuilderA<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> = DiffNodeA<
//     T,
//     T,
//     '',
//     C
// >;

export type DiffNodeA<
    Root,
    Current,
    P extends Path<Root>,
    C extends JsonPatchConfig,
    Tag extends PropertyKey,
> = ReplaceAndTestMethodsA<Root, P> & // operations at this path (unchanged)
    AddMethodsA<Root, P, C> &
    RemoveMethodsA<Root, P, C> &
    // navigation
    // 🔹 tagged union → must choose an arm via variant()
    (IsTaggedUnion<Current, Tag> extends true
        ? {
              variant<V extends VariantTags<NonNullish<Current>, Tag> & (string | number | symbol)>(
                  tag: V,
              ): DiffNodeA<Root, VariantOf<NonNullish<Current>, Tag, V>, P, C, Tag>;
          }
        : // 🔹 arrays → index navigation
          NonNullish<Current> extends (infer Elem)[]
          ? {
                [K in number]: DiffNodeA<
                    Root,
                    Elem,
                    `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                    C,
                    Tag
                >;
            } & {
                push(value: Elem): void;
                move(from: number, to: number): void;
                reorder(indices: number[]): void;
            }
          : // 🔹 plain objects (including unions that are NOT tagged on Tag)
            NonNullish<Current> extends object
            ? {
                  [K in KeysOfUnion<NonNullish<Current>> & (string | number)]: DiffNodeA<
                      Root,
                      ValueOfUnion<NonNullish<Current>, K>,
                      // P extends "" ? `/${K & (string | number)}` : `${P}/${K & (string | number)}`,
                      `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                      C,
                      Tag
                  >;
              } & (string extends keyof NonNullish<Current> // optional: index signatures (Record<string, V>)
                  ? {
                        [key: string]: DiffNodeA<
                            Root,
                            NonNullish<Current>[string],
                            //   P extends "" ? `/${string}` : `${P}/${string}`,
                            `${P}/${string}` extends Path<Root> ? `${P}/${string}` : never,
                            C,
                            Tag
                        >;
                    }
                  : {})
            : {});

export type DiffBuilderA<
    T,
    C extends JsonPatchConfig = DefaultJsonPatchConfig,
    Tag extends PropertyKey = 'type',
> = DiffNodeA<T, T, '', C, Tag>;

export function diffBuilderApply<T, C extends JsonPatchConfig = DefaultJsonPatchConfig>(
    apply: (v: PendingJsonPatchOp<T>) => void,
): DiffBuilderA<T, C> {
    const cache: Record<string, Function> = {};

    function makeProxy(pathSegments: Array<string | number>): any {
        const path =
            pathSegments.length === 0
                ? '' // root replace
                : '/' + pathSegments.map(String).join('/');

        const handler: ProxyHandler<any> = {
            get(_target, prop, _receiver) {
                if (prop === 'variant') {
                    // Ignore type refinement ... although it might be nice to put it in there somehow...
                    return (_tag: any) => {
                        // same path, same handler
                        return new Proxy({}, handler);
                    };
                }

                // Operation handlers
                if (prop === 'replace') {
                    const k = path + '/replace';
                    if (!cache[k])
                        cache[k] = (value: any) =>
                            apply({op: 'replace', path: path as Path<T>, value});
                    return cache[k];
                }

                if (prop === 'push') {
                    const k = path + '/push';
                    if (!cache[k])
                        cache[k] = (value: any) =>
                            apply({op: 'push', path: path as ArrayContainerPath<T>, value});
                    return cache[k];
                }

                if (prop === 'add') {
                    const k = path + '/add';
                    if (!cache[k])
                        cache[k] = (value: any) =>
                            apply({op: 'add', path: path as AddPath<T>, value});
                    return cache[k];
                }

                if (prop === 'remove') {
                    const k = path + '/remove';
                    if (!cache[k])
                        cache[k] = () => apply({op: 'remove', path: path as RemovablePath<T>});
                    return cache[k];
                }

                if (prop === 'move') {
                    throw new Error('not impl move yet');
                }
                if (prop === 'reorder') {
                    throw new Error('not impl reorder yet');
                }

                // Ignore symbols (e.g. util.inspect.custom)
                if (typeof prop === 'symbol') {
                    return undefined;
                }

                // Descend: property or numeric index
                const key =
                    typeof prop === 'string' && /^\d+$/.test(prop)
                        ? Number(prop)
                        : (prop as string | number);

                return makeProxy([...pathSegments, key]);
            },
        };

        return new Proxy({}, handler);
    }

    return makeProxy([]) as DiffBuilderA<T, C>;
}

// Strip null/undefined for navigation
type NonNullish<T> = Exclude<T, null | undefined>;

// "Is this a union?" helper
type IsUnion<T, U = T> = (T extends any ? (x: T) => void : never) extends (x: U) => void
    ? false
    : true;

// All tag values for a given discriminant
type VariantTags<T, Tag extends PropertyKey> = T extends {[K in Tag]: infer V} ? V : never;

// The arm of a tagged union where Tag == V
type VariantOf<T, Tag extends PropertyKey, V extends VariantTags<T, Tag>> = Extract<
    T,
    {[K in Tag]: V}
>;

// "Is this a tagged union on Tag?"
type IsTaggedUnion<Current, Tag extends PropertyKey> = NonNullish<Current> extends {[K in Tag]: any}
    ? IsUnion<NonNullish<Current>>
    : false;

// For normal object navigation over unions
type KeysOfUnion<T> = T extends any ? keyof T : never;

type ValueOfUnion<T, K extends PropertyKey> = T extends any
    ? K extends keyof T
        ? T[K]
        : never
    : never;

export type DiffNode<
    Root,
    Current,
    P extends Path<Root>,
    C extends JsonPatchConfig,
    Tag extends PropertyKey,
> = ReplaceAndTestMethods<Root, P> & // operations at this path (unchanged)
    AddMethods<Root, P, C> &
    RemoveMethods<Root, P, C> &
    // navigation
    // 🔹 tagged union → must choose an arm via variant()
    (IsTaggedUnion<Current, Tag> extends true
        ? {
              variant<V extends VariantTags<NonNullish<Current>, Tag> & (string | number | symbol)>(
                  tag: V,
              ): DiffNode<Root, VariantOf<NonNullish<Current>, Tag, V>, P, C, Tag>;
          }
        : // 🔹 arrays → index navigation
          NonNullish<Current> extends (infer Elem)[]
          ? {
                [K in number]: DiffNode<
                    Root,
                    Elem,
                    `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                    C,
                    Tag
                >;
            }
          : // 🔹 plain objects (including unions that are NOT tagged on Tag)
            NonNullish<Current> extends object
            ? {
                  [K in KeysOfUnion<NonNullish<Current>> & (string | number)]: DiffNode<
                      Root,
                      ValueOfUnion<NonNullish<Current>, K>,
                      // P extends "" ? `/${K & (string | number)}` : `${P}/${K & (string | number)}`,
                      `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                      C,
                      Tag
                  >;
              } & (string extends keyof NonNullish<Current> // optional: index signatures (Record<string, V>)
                  ? {
                        [key: string]: DiffNode<
                            Root,
                            NonNullish<Current>[string],
                            //   P extends "" ? `/${string}` : `${P}/${string}`,
                            `${P}/${string}` extends Path<Root> ? `${P}/${string}` : never,
                            C,
                            Tag
                        >;
                    }
                  : {})
            : {});

export type DiffBuilder<
    T,
    C extends JsonPatchConfig = DefaultJsonPatchConfig,
    Tag extends PropertyKey = 'kind',
> = DiffNode<T, T, '', C, Tag>;

export function diffBuilder<
    T,
    C extends JsonPatchConfig = DefaultJsonPatchConfig,
    Tag extends PropertyKey = 'kind',
>(): DiffBuilder<T, C, Tag> {
    function makeProxy(pathSegments: Array<string | number>): any {
        const handler: ProxyHandler<any> = {
            get(_target, prop, _receiver) {
                // variant() – runtime no-op, type-level narrowing handled via DiffNode
                if (prop === 'variant') {
                    return (_tag: any) => {
                        // same path, same handler
                        return new Proxy({}, handler);
                    };
                }

                if (prop === 'replace') {
                    return (value: any) => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');
                        return {op: 'replace' as const, path, value};
                    };
                }

                if (prop === 'test') {
                    return (value: any) => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');
                        return {op: 'test' as const, path, value};
                    };
                }

                if (prop === 'add') {
                    return (value: any) => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');
                        return {op: 'add' as const, path, value};
                    };
                }

                if (prop === 'remove') {
                    return () => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');
                        return {op: 'remove' as const, path};
                    };
                }

                if (typeof prop === 'symbol') return undefined;

                // property / index navigation
                const key =
                    typeof prop === 'string' && /^\d+$/.test(prop)
                        ? Number(prop)
                        : (prop as string | number);

                return makeProxy([...pathSegments, key]);
            },
        };

        return new Proxy({}, handler);
    }

    return makeProxy([]) as DiffBuilder<T, C, Tag>;
}
