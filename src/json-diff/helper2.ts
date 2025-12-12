// const TAG_KEY = 'kind' as const; // or "type" or make it a generic param

export type PathSegment =
    | {type: 'key'; key: string | number}
    | {type: 'tag'; key: string; value: string};

type ReplaceAndTestMethodsA<Value, R> = {
    replace(value: Value): R;
};

// Only if P is an AddPath<Root, C>
type AddMethodsA<Value, R> = {add(value: Value): R};

// Only if P is a RemovablePath<Root, C>
type RemoveMethodsA<R> = {remove(): R};

export type Builder<Current, Tag extends PropertyKey = 'type'> = DiffNodeA<
    unknown,
    Current,
    Tag,
    void
>;

type OpMaker<Value, Tag extends PropertyKey> = (
    v: Value,
    update: DiffNodeA<Value, Value, Tag, PendingJsonPatchOp<Value>>,
) => PendingJsonPatchOp<Value> | PendingJsonPatchOp<Value>[];

type UpdateFunction<Value, Tag extends PropertyKey, R> = (opMaker: OpMaker<Value, Tag>) => R;

export type DiffNodeA<Root, Current, Tag extends PropertyKey, R> = ReplaceAndTestMethodsA<
    Current,
    R
> & // operations at this path (unchanged)
    AddMethodsA<Current, R> &
    RemoveMethodsA<R> &
    UpdateFunction<Current, Tag, R> &
    // navigation
    // 🔹 tagged union → must choose an arm via variant()
    (IsTaggedUnion<Current, Tag> extends true
        ? {
              variant<V extends VariantTags<NonNullish<Current>, Tag> & (string | number | symbol)>(
                  tag: V,
              ): DiffNodeA<Root, VariantOf<NonNullish<Current>, Tag, V>, Tag, R>;
          }
        : // 🔹 arrays → index navigation
          NonNullish<Current> extends (infer Elem)[]
          ? {
                [K in number]: DiffNodeA<Root, Elem, Tag, R>;
            } & {
                push(value: Elem): R;
                move(from: number, to: number): R;
                reorder(indices: number[]): R;
            }
          : // 🔹 plain objects (including unions that are NOT tagged on Tag)
            NonNullish<Current> extends object
            ? {
                  [K in KeysOfUnion<NonNullish<Current>> & (string | number)]: DiffNodeA<
                      Root,
                      ValueOfUnion<NonNullish<Current>, K>,
                      Tag,
                      R
                  >;
              } & (string extends keyof NonNullish<Current> // optional: index signatures (Record<string, V>)
                  ? {
                        [key: string]: DiffNodeA<Root, NonNullish<Current>[string], Tag, R>;
                    }
                  : {})
            : {});

export type DiffBuilderA<T, Tag extends PropertyKey = 'type', R = void> = DiffNodeA<T, T, Tag, R>;

export function diffBuilder<T, Tag extends string = 'type'>(tag: Tag) {
    return diffBuilderApply<T, Tag, PendingJsonPatchOp<T>>((x) => x, tag);
}

export function diffBuilderApply<T, Tag extends string = 'type', R = void>(
    apply: (v: PendingJsonPatchOp<T>) => R,
    tag: Tag,
): DiffBuilderA<T, Tag, R> {
    const cache: Record<string, (v: any) => R> = {};
    const proxyCache: Record<string, any> = {};
    const ghost = {} as {_t: T}; // a phantom type kinda thing
    function makeProxy(path: Array<PathSegment>): any {
        const pathString = JSON.stringify(path);

        const handler: ProxyHandler<any> = {
            get(_target, prop, _receiver) {
                // 🔹 variant(): refine the *last* path segment with `[kind=value]`
                if (prop === 'variant') {
                    return (tagValue: string) => {
                        if (!tag) throw new Error(`no tag identifier configured`);

                        return makeProxy(path.concat([{type: 'tag', key: tag, value: tagValue}]));
                    };
                }

                // 🔹 operations
                if (prop === 'replace') {
                    const k = pathString + '/replace';
                    if (!cache[k])
                        cache[k] = (value) => apply({op: 'replace', path, value, ...ghost});
                    return cache[k];
                }

                if (prop === 'add') {
                    const k = pathString + '/add';
                    if (!cache[k]) cache[k] = (value) => apply({op: 'add', path, value, ...ghost});
                    return cache[k];
                }

                if (prop === 'push') {
                    const k = pathString + '/push';
                    if (!cache[k]) cache[k] = (value) => apply({op: 'push', path, value, ...ghost});
                    return cache[k];
                }

                if (prop === 'remove') {
                    const k = pathString + '/remove';
                    if (!cache[k]) cache[k] = () => apply({op: 'remove', path, ...ghost});
                    return cache[k];
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

        return new Proxy((opMaker: OpMaker<T, Tag>) => {
            return apply({op: 'nested', make: opMaker as any, path, ...ghost});
        }, handler);
    }
    return makeProxy([]) as DiffBuilderA<T, Tag, R>;
}

type Path = PathSegment[];

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

export type PendingReplaceOp<T> = {op: 'replace'; path: Path; value: unknown; _t: T};

export type PendingRemoveOp<T> = {op: 'remove'; path: Path; _t: T};

export type PendingPushOp<T> = {op: 'push'; path: Path; value: unknown; _t: T};

export type NestedPendingOp<T, Inner, Tag extends PropertyKey> = {
    op: 'nested';
    path: Path;
    make: (
        v: Inner,
        update: DiffNodeA<Inner, Inner, Tag, PendingJsonPatchOp<Inner>>,
    ) => PendingJsonPatchOp<Inner> | PendingJsonPatchOp<Inner>[];
    _t: T;
};

export type PendingJsonPatchOp<T, Tag extends PropertyKey = 'type'> =
    | AddOp<T>
    | PendingReplaceOp<T>
    | PendingPushOp<T>
    | PendingRemoveOp<T>
    | NestedPendingOp<T, unknown, Tag>
    | MoveOp<T>
    | CopyOp<T>;

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
