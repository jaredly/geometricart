// const TAG_KEY = 'kind' as const; // or "type" or make it a generic param

export type ApplyTiming = 'immediate' | 'preview' | undefined;

export type PathSegment =
    | {type: 'key'; key: string | number}
    | {type: 'tag'; key: string; value: string}
    | {type: 'single'; isSingle: boolean};

type ReplaceAndTestMethodsA<Value, R> = {
    replace(value: Value, when?: ApplyTiming): R;
};

// Only if P is an AddPath<Root, C>
type AddMethodsA<Value, R> = {add(value: Value, when?: ApplyTiming): R};

// Only if P is a RemovablePath<Root, C>
type RemoveMethodsA<R> = {remove(when?: ApplyTiming | React.MouseEvent): R};

type OpMaker<Value, Tag extends PropertyKey, Extra> = (
    v: Value,
    update: DiffNodeA<Value, Value, Tag, PendingJsonPatchOp<Value, Tag, Extra>, Extra>,
) => PendingJsonPatchOp<Value, Tag, Extra> | PendingJsonPatchOp<Value, Tag, Extra>[];

type UpdateFunction<Value, Tag extends PropertyKey, R, Extra> = (
    opMaker: Value | OpMaker<Value, Tag, Extra>,
    when?: ApplyTiming,
) => R;

const getPathSymbol = Symbol('get path');
const getExtraSymbol = Symbol('get extra');

export type DiffNodeA<Root, Current, Tag extends PropertyKey, R, Extra = unknown> = AddMethodsA<
    Current,
    R
> & {
    // operations at this path (unchanged)
    [getPathSymbol]: Path;
    [getExtraSymbol]: Extra;
} & ReplaceAndTestMethodsA<Current, R> &
    RemoveMethodsA<R> &
    UpdateFunction<Current, Tag, R, Extra> &
    // navigation
    // 🔹 "one or many" → refine T | T[] via single()
    (IsSingleOrArray<Current> extends true
        ? {
              single<V extends boolean>(
                  isSingle: V,
              ): DiffNodeA<
                  Root,
                  V extends true ? SingleElement<Current> : SingleElement<Current>[],
                  Tag,
                  R,
                  Extra
              >;
          }
        : // biome-ignore lint: this one is fine
          {}) &
    // 🔹 tagged union → must choose an arm via variant()
    (IsTaggedUnion<Current, Tag> extends true
        ? {
              variant<V extends VariantTags<NonNullish<Current>, Tag> & (string | number | symbol)>(
                  tag: V,
              ): DiffNodeA<Root, VariantOf<NonNullish<Current>, Tag, V>, Tag, R, Extra>;
              variant<Result>(
                  value: Current,
                  kindFns: {
                      [V in VariantTags<NonNullish<Current>, Tag> & (string | number | symbol)]: (
                          value: VariantOf<NonNullish<Current>, Tag, V>,
                          up: DiffNodeA<
                              Root,
                              VariantOf<NonNullish<Current>, Tag, V>,
                              Tag,
                              R,
                              Extra
                          >,
                      ) => Result;
                  },
              ): Result;
          }
        : // 🔹 arrays → index navigation
          NonNullish<Current> extends (infer Elem)[]
          ? {
                [K in number]: DiffNodeA<Root, Elem, Tag, R, Extra>;
            } & {
                push(value: Elem, when?: ApplyTiming): R;
                move(from: string | number, to: string | number, when?: ApplyTiming): R;
                reorder(indices: number[]): R;
            }
          : // 🔹 plain objects (including unions that are NOT tagged on Tag)
            NonNullish<Current> extends object
            ? {
                  [K in KeysOfUnion<NonNullish<Current>> & (string | number)]: DiffNodeA<
                      Root,
                      ValueOfUnion<NonNullish<Current>, K>,
                      Tag,
                      R,
                      Extra
                  >;
              } & {
                  move(from: string | number, to: string | number, when?: ApplyTiming): R;
              } & (string extends keyof NonNullish<Current> // optional: index signatures (Record<string, V>)
                      ? {
                            [key: string]: DiffNodeA<
                                Root,
                                NonNullish<Current>[string],
                                Tag,
                                R,
                                Extra
                            >;
                        }
                      : // biome-ignore lint: this one is fine
                        {})
            : // biome-ignore lint: this one is fine
              {});

export type DiffBuilderA<
    T,
    Tag extends PropertyKey = 'type',
    R = void,
    Extra = unknown,
> = DiffNodeA<T, T, Tag, R, Extra>;

export function diffBuilder<T, Extra, Tag extends string = 'type'>(tag: Tag, extra: Extra) {
    return diffBuilderApply<T, Extra, Tag, PendingJsonPatchOp<T, Tag, Extra>>((x) => x, extra, tag);
}

export const getPath = <A, B, T extends PropertyKey, C, E>(builder: DiffNodeA<A, B, T, C, E>) =>
    builder[getPathSymbol];

export const getExtra = <A, B, T extends PropertyKey, C, E>(builder: DiffNodeA<A, B, T, C, E>): E =>
    builder[getExtraSymbol];

export function diffBuilderApply<T, Extra, Tag extends string = 'type', R = void>(
    apply: (v: PendingJsonPatchOp<T, Tag, Extra>, when?: ApplyTiming) => R,
    extra: Extra,
    tag: Tag,
): DiffBuilderA<T, Tag, R, Extra> {
    // biome-ignore lint: this one is fine
    const cache: Record<string, (v: any, b: any) => R> = {};
    // biome-ignore lint: this one is fine
    const proxyCache: Record<string, any> = {};
    const ghost = {} as {_t: T}; // a phantom type kinda thing
    // biome-ignore lint: this one is fine
    function makeProxy(path: Array<PathSegment>): any {
        const pathString = JSON.stringify(path);

        // biome-ignore lint: this one is fine
        const handler: ProxyHandler<any> = {
            get(_target, prop, _receiver) {
                // 🔹 variant(): refine the *last* path segment with `[kind=value]`
                if (prop === 'variant') {
                    return (...args: [string] | [any, Record<string, any>]) => {
                        if (!args.length) {
                            throw new Error(`Invalid call`);
                        }
                        if (args.length === 1) {
                            const [tagValue] = args;

                            const k = pathString + '/' + tagValue;
                            if (!proxyCache[k])
                                proxyCache[k] = makeProxy([
                                    ...path,
                                    {type: 'tag', key: tag, value: tagValue},
                                ]);
                            return proxyCache[k];
                        }
                        const [value, record] = args;
                        const tagValue = value[tag];

                        const k = pathString + '/' + tagValue;
                        if (!proxyCache[k])
                            proxyCache[k] = makeProxy([
                                ...path,
                                {type: 'tag', key: tag, value: tagValue},
                            ]);

                        return record[value[tag]](value, proxyCache[k]);
                    };
                }

                // 🔹 operations
                if (prop === 'replace') {
                    const k = pathString + '/replace';
                    if (!cache[k])
                        cache[k] = (value, when?: ApplyTiming) =>
                            apply({op: 'replace', path, value, ...ghost}, when);
                    return cache[k];
                }

                if (prop === 'single') {
                    return (isSingle: boolean) => {
                        const k = pathString + '/single/' + (isSingle ? '1' : '0');
                        if (!proxyCache[k])
                            proxyCache[k] = makeProxy([
                                ...path,
                                {type: 'single', isSingle: !!isSingle},
                            ]);
                        return proxyCache[k];
                    };
                }

                if (prop === 'add') {
                    const k = pathString + '/add';
                    if (!cache[k])
                        cache[k] = (value, when?: ApplyTiming) =>
                            apply({op: 'add', path, value, ...ghost}, when);
                    return cache[k];
                }

                if (prop === 'move') {
                    const k = pathString + '/move';
                    if (!cache[k])
                        cache[k] = (
                            from: string | number,
                            to: string | number,
                            when?: ApplyTiming,
                        ) => {
                            const normalize = (v: string | number) =>
                                typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
                            const fromKey = normalize(from);
                            const toKey = normalize(to);
                            return apply(
                                {
                                    op: 'move',
                                    from: [...path, {type: 'key', key: fromKey}],
                                    path: [...path, {type: 'key', key: toKey}],
                                    ...ghost,
                                    // biome-ignore lint: this one is fine
                                } as any,
                                when,
                            );
                        };
                    return cache[k];
                }

                if (prop === 'push') {
                    const k = pathString + '/push';
                    if (!cache[k])
                        cache[k] = (value, when?: ApplyTiming) =>
                            apply({op: 'push', path, value, ...ghost}, when);
                    return cache[k];
                }

                if (prop === 'remove') {
                    const k = pathString + '/remove';
                    if (!cache[k])
                        cache[k] = (when?: ApplyTiming | React.MouseEvent) =>
                            apply(
                                {op: 'remove', path, ...ghost},
                                typeof when === 'string' ? when : undefined,
                            );
                    return cache[k];
                }

                if (prop === getPathSymbol) {
                    return path;
                }
                if (prop === getExtraSymbol) {
                    return extra;
                }

                // ignore symbols
                if (typeof prop === 'symbol') return undefined;

                // 🔹 navigation: property or index
                const key =
                    typeof prop === 'string' && /^\d+$/.test(prop)
                        ? Number(prop)
                        : (prop as string | number);

                const k = pathString + '-' + prop;
                if (!proxyCache[k]) proxyCache[k] = makeProxy([...path, {type: 'key', key}]);
                return proxyCache[k];
            },
        };

        return new Proxy((value: T | OpMaker<T, Tag, Extra>, when?: ApplyTiming) => {
            if (typeof value !== 'function') {
                return apply({op: 'replace', path, value, ...ghost}, when);
            }
            // biome-ignore lint: this one is fine
            return apply({op: 'nested', make: value as any, path, ...ghost}, when);
        }, handler);
    }
    return makeProxy([]) as DiffBuilderA<T, Tag, R, Extra>;
}

export type Path = PathSegment[];

export type AddOp<T> = {op: 'add'; path: Path; value: unknown; _t: T};

export type ReplaceOp<T> = {
    op: 'replace';
    path: Path;
    value: unknown;
    previous: unknown;
    _t: T;
};

export type RemoveOp<T> = {op: 'remove'; path: Path; value: unknown; _t: T};

export type MoveOp<T> = {op: 'move'; from: Path; path: Path; _t: T};

export type CopyOp<T> = {op: 'copy'; from: Path; path: Path; _t: T};

export type JsonPatchOp<T> = AddOp<T> | ReplaceOp<T> | RemoveOp<T> | MoveOp<T> | CopyOp<T>;

export type PendingReplaceOp<T> = {
    op: 'replace';
    path: Path;
    value: unknown;
    _t: T;
};

export type PendingRemoveOp<T> = {op: 'remove'; path: Path; _t: T};

export type PendingPushOp<T> = {
    op: 'push';
    path: Path;
    value: unknown;
    _t: T;
};

export type NestedPendingOp<T, Inner, Tag extends PropertyKey, Extra = unknown> = {
    op: 'nested';
    path: Path;
    make: (
        v: Inner,
        update: DiffNodeA<Inner, Inner, Tag, PendingJsonPatchOp<Inner, Tag, Extra>, Extra>,
    ) => PendingJsonPatchOp<Inner, Tag, Extra> | PendingJsonPatchOp<Inner, Tag, Extra>[];
    _t: T;
};

export type PendingJsonPatchOp<T, Tag extends PropertyKey = 'type', Extra = unknown> =
    | AddOp<T>
    | PendingReplaceOp<T>
    | PendingPushOp<T>
    | PendingRemoveOp<T>
    | NestedPendingOp<T, unknown, Tag, Extra>
    | MoveOp<T>
    | CopyOp<T>;

// Strip null/undefined for navigation
type NonNullish<T> = Exclude<T, null | undefined>;

type ArrayElement<T> = T extends (infer Elem)[] ? Elem : never;

type SingleElement<T> = ArrayElement<NonNullish<T>>;

type IsSingleOrArray<Current> = [NonNullish<Current>] extends [never]
    ? false
    : NonNullish<Current> extends SingleElement<Current> | SingleElement<Current>[]
      ? SingleElement<Current> | SingleElement<Current>[] extends NonNullish<Current>
          ? true
          : false
      : false;

// "Is this a union?" helper
// biome-ignore lint: this one is fine
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
// biome-ignore lint: this one is fine
type IsTaggedUnion<Current, Tag extends PropertyKey> = NonNullish<Current> extends {[K in Tag]: any}
    ? IsUnion<NonNullish<Current>>
    : false;

// For normal object navigation over unions
// biome-ignore lint: this one is fine
type KeysOfUnion<T> = T extends any ? keyof T : never;

// biome-ignore lint: this one is fine
type ValueOfUnion<T, K extends PropertyKey> = T extends any
    ? K extends keyof T
        ? T[K]
        : never
    : never;
