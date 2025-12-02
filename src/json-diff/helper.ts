import {make} from './make';
import {
    AddOpForPath,
    AddPath,
    AddPathValue,
    DefaultJsonPatchConfig,
    JsonPatchConfig,
    JsonPatchOp,
    Path,
    PathValue,
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

export type DiffNode<
    Root,
    Current,
    P extends Path<Root>,
    C extends JsonPatchConfig,
> = ReplaceAndTestMethods<Root, P> & // operations at the current path
    AddMethods<Root, P, C> &
    RemoveMethods<Root, P, C> &
    // navigation
    // Arrays → numeric index navigation
    (Current extends (infer Elem)[]
        ? {
              [K in number]: DiffNode<
                  Root,
                  Elem,
                  `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                  C
              >;
          }
        : // Objects → property navigation
          Current extends object
          ? {
                [K in keyof NonNullable<Current> & (string | number)]: DiffNode<
                    Root,
                    Current[K],
                    `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                    C
                >;
            } & (string extends keyof Current // Index signature support, e.g. Record<string, V>
                ? {
                      [key: string]: DiffNode<
                          Root,
                          Current[string],
                          `${P}/${string}` extends Path<Root> ? `${P}/${string}` : never,
                          C
                      >;
                  }
                : {})
          : {});

// Root builder type
export type DiffBuilder<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> = DiffNode<
    T,
    T,
    '',
    C
>;

export function diffBuilder<T, C extends JsonPatchConfig = DefaultJsonPatchConfig>(
    current: () => T,
): DiffBuilder<T, C> {
    function makeProxy(pathSegments: Array<string | number>): any {
        const handler: ProxyHandler<any> = {
            get(_target, prop, _receiver) {
                // Operation handlers
                if (prop === 'replace') {
                    return (value: any) => {
                        const path =
                            pathSegments.length === 0
                                ? '' // root replace
                                : '/' + pathSegments.map(String).join('/');

                        return make.replace(current(), path as Path<T>, value);
                    };
                }

                if (prop === 'add') {
                    return (value: any): AddOpForPath<T, any> => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');

                        return make.add(current(), path as AddPath<T>, value);
                    };
                }

                if (prop === 'remove') {
                    return (): RemoveOpForPath<T, C, any> => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');

                        return make.remove(current(), path as RemovablePath<T>);
                    };
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

    return makeProxy([]) as DiffBuilder<T, C>;
}

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

export type DiffNodeA<
    Root,
    Current,
    P extends Path<Root>,
    C extends JsonPatchConfig,
> = ReplaceAndTestMethodsA<Root, P> & // operations at the current path
    AddMethodsA<Root, P, C> &
    RemoveMethodsA<Root, P, C> &
    // navigation
    // Arrays → numeric index navigation
    (Current extends (infer Elem)[]
        ? {
              [K in number]: DiffNodeA<
                  Root,
                  Elem,
                  `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                  C
              >;
          }
        : // Objects → property navigation
          Current extends object
          ? {
                [K in keyof Current & (string | number)]: DiffNodeA<
                    Root,
                    Current[K] & {},
                    `${P}/${K}` extends Path<Root> ? `${P}/${K}` : never,
                    C
                >;
            } & (string extends keyof Current // Index signature support, e.g. Record<string, V>
                ? {
                      [Key in keyof Current & string]: DiffNodeA<
                          Root,
                          Current[Key] & {},
                          `${P}/${Key}` extends Path<Root> ? `${P}/${Key}` : never,
                          C
                      >;
                  }
                : {})
          : {});

// Root builder type
export type DiffBuilderA<T, C extends JsonPatchConfig = DefaultJsonPatchConfig> = DiffNodeA<
    T,
    T,
    '',
    C
>;

export function diffBuilderApply<T, C extends JsonPatchConfig = DefaultJsonPatchConfig>(
    current: () => T,
    apply: (v: JsonPatchOp<T>) => void,
): DiffBuilderA<T, C> {
    function makeProxy(pathSegments: Array<string | number>): any {
        const handler: ProxyHandler<any> = {
            get(_target, prop, _receiver) {
                // Operation handlers
                if (prop === 'replace') {
                    return (value: any) => {
                        const path =
                            pathSegments.length === 0
                                ? '' // root replace
                                : '/' + pathSegments.map(String).join('/');

                        apply(make.replace(current(), path as Path<T>, value));
                    };
                }

                if (prop === 'add') {
                    return (value: any) => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');

                        apply(make.add(current(), path as AddPath<T>, value));
                    };
                }

                if (prop === 'remove') {
                    return () => {
                        const path =
                            pathSegments.length === 0
                                ? ''
                                : '/' + pathSegments.map(String).join('/');

                        apply(make.remove(current(), path as RemovablePath<T>));
                    };
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
