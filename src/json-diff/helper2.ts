const TAG_KEY = 'kind' as const; // or "type" or make it a generic param

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

export type DiffNodeA<Root, Current, Tag extends PropertyKey, R> = ReplaceAndTestMethodsA<
    Current,
    R
> & // operations at this path (unchanged)
    AddMethodsA<Current, R> &
    RemoveMethodsA<R> &
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
                    if (!cache[k]) cache[k] = (value) => apply({op: 'replace', path, value});
                    return cache[k];
                }

                if (prop === 'add') {
                    const k = pathString + '/add';
                    if (!cache[k]) cache[k] = (value) => apply({op: 'add', path, value});
                    return cache[k];
                }

                if (prop === 'push') {
                    const k = pathString + '/push';
                    if (!cache[k]) cache[k] = (value) => apply({op: 'push', path, value});
                    return cache[k];
                }

                if (prop === 'remove') {
                    const k = pathString + '/remove';
                    if (!cache[k]) cache[k] = () => apply({op: 'remove', path});
                    return cache[k];
                }

                // ignore symbols
                if (typeof prop === 'symbol') return undefined;

                // 🔹 navigation: property or index
                const key =
                    typeof prop === 'string' && /^\d+$/.test(prop)
                        ? Number(prop)
                        : (prop as string | number);

                return makeProxy([...path, {type: 'key', key}]);
            },
        };

        return new Proxy({}, handler);
    }
    return makeProxy([]) as DiffBuilderA<T, Tag, R>;
}

type Path = PathSegment[];

export type AddOp<T> = {op: 'add'; path: Path; value: T};

export type ReplaceOp<T> = {
    op: 'replace';
    path: Path;
    value: T;
    previous: T;
};

export type RemoveOp<T> = {op: 'remove'; path: Path; value: T};

export type MoveOp<T> = {op: 'move'; from: Path; path: Path};

export type CopyOp<T> = {op: 'copy'; from: T; path: T};

export type JsonPatchOp<T> = AddOp<T> | ReplaceOp<T> | RemoveOp<T> | MoveOp<T> | CopyOp<T>;

export type PendingReplaceOp<T> = {op: 'replace'; path: Path; value: T};

export type PendingRemoveOp<T> = {op: 'remove'; path: Path};

export type PendingPushOp<T> = {op: 'push'; path: Path; value: T};

export type PendingJsonPatchOp<T> =
    | AddOp<T>
    | PendingReplaceOp<T>
    | PendingPushOp<T>
    | PendingRemoveOp<T>
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
