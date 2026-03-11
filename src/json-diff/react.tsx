import equal from 'fast-deep-equal';
import {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
    ApplyTiming,
    diffBuilderApply,
    DiffNodeA,
    getExtra,
    getPath,
    Path,
    PathSegment,
    PendingJsonPatchOp,
    JsonPatchOp,
} from './helper2';
import {Annotations, blankHistory, dispatch, History} from './history';
import {asFlat, MaybeNested, resolveAndApply} from './make2';
import {useLatest} from '../routes/screens/pattern.screen/utils/useLatest';
import {_get} from './internal2';
import {Updater} from './Updater';

type C<T> = {
    state: T;
    save: (v: T) => void;
    listeners: (() => void)[];
};

type ContextBase<T, Change, Tag extends string> = {
    state: T;
    save: (v: T) => void;
    listeners: (() => void)[];
    previewState: null | T;
    raf?: number;
    listenersByPath: PathListenerNode;
    queuedChanges: QueuedChanges<Change, Tag>;
};

type ContextHistory = {
    historyListeners: (() => void)[];
    historyUp: (() => void)[];
};

type QueuedChanges<T, Tag extends string = 'type'> = PendingJsonPatchOp<T, Tag, Extra>[];

type CH<T, An, Tag extends string = 'type'> = ContextBase<History<T, An>, T, Tag> & ContextHistory;

export type Extra = {
    getForPath<T>(v: Path): T;
    listenToPath(v: Path, f: () => void): () => void;
};

type PathListener = () => void;

type PathListenerNode = {
    listeners: Set<PathListener>;
    children: Map<string, PathListenerNode>;
};

const makePathListenerNode = (): PathListenerNode => ({
    listeners: new Set(),
    children: new Map(),
});

const segmentKey = (seg: PathSegment) => {
    switch (seg.type) {
        case 'key':
            return `k:${typeof seg.key === 'number' ? `n:${seg.key}` : `s:${seg.key}`}`;
        case 'tag':
            return `t:${seg.key}=${seg.value}`;
        case 'single':
            return `s:${seg.isSingle ? '1' : '0'}`;
    }
};

const addPathListener = (root: PathListenerNode, path: Path, listener: PathListener) => {
    let node = root;
    for (const seg of path) {
        const key = segmentKey(seg);
        let child = node.children.get(key);
        if (!child) {
            child = makePathListenerNode();
            node.children.set(key, child);
        }
        node = child;
    }
    node.listeners.add(listener);
};

const removePathListener = (root: PathListenerNode, path: Path, listener: PathListener) => {
    const stack: Array<{node: PathListenerNode; key?: string}> = [{node: root}];
    let node = root;
    for (const seg of path) {
        const key = segmentKey(seg);
        const child = node.children.get(key);
        if (!child) return;
        stack.push({node: child, key});
        node = child;
    }
    node.listeners.delete(listener);
    for (let i = stack.length - 1; i > 0; i--) {
        const {node: child, key} = stack[i];
        const parent = stack[i - 1].node;
        if (child.children.size === 0 && child.listeners.size === 0) {
            parent.children.delete(key as string);
        }
    }
};

const collectAll = (node: PathListenerNode | undefined, out: Set<PathListener>) => {
    if (!node) return;
    node.listeners.forEach((l) => out.add(l));
    node.children.forEach((child) => collectAll(child, out));
};

// ok here we are. we want to ... notify all items and children?
const notifyPaths = (root: PathListenerNode, paths: Path[]) => {
    if (!paths.length) return;
    const listeners = new Set<PathListener>();
    paths.forEach((p) => {
        let node: PathListenerNode | undefined = root;
        node.listeners.forEach((l) => listeners.add(l));
        for (const seg of p) {
            node = node?.children.get(segmentKey(seg));
            if (!node) break;
            node.listeners.forEach((l) => listeners.add(l));
        }
        collectAll(node, listeners);
    });
    listeners.forEach((l) => l());
};

const notifyAllPaths = (root: PathListenerNode) => {
    const listeners = new Set<PathListener>();
    collectAll(root, listeners);
    listeners.forEach((l) => l());
};

const changedPaths = (changes: JsonPatchOp<unknown>[]) => {
    const paths: Path[] = [];
    changes.forEach((op) => {
        paths.push(op.path);
        if (op.op === 'move') paths.push(op.from);
    });
    return paths;
};

export const useValue: (<Current, Return, Tag extends PropertyKey>(
    node: DiffNodeA<unknown, Current, Tag, unknown, Extra>,
    mod: (v: Current) => Return,
    exact?: boolean,
) => Return) &
    (<Current, Tag extends PropertyKey>(
        node: DiffNodeA<unknown, Current, Tag, unknown, Extra>,
    ) => Current) = <Current, Return, Tag extends PropertyKey>(
    node: DiffNodeA<unknown, Current, Tag, unknown, Extra>,
    mod: (v: Current) => Return = (v) => v as any,
    exact = true,
) => {
    const path = getPath(node);
    const extra = getExtra(node);
    const [v, setV] = useState(() => mod(extra.getForPath<Current>(path)));
    const lv = useLatest(v);
    const lmod = useLatest(mod);
    useEffect(
        () =>
            extra.listenToPath(path, () => {
                const nw = lmod.current(extra.getForPath<Current>(path));
                if (exact ? !equal(lv.current, nw) : lv.current !== nw) {
                    lv.current = nw;
                    setV(nw);
                }
            }),
        [extra, path, lv, lmod, exact],
    );
    return v;
};

const makeHistoryProvider = <T, An, Tag extends string = 'type'>(
    Ctx: React.Context<CH<T, An, Tag>>,
) => {
    return function Provide({
        children,
        initial,
        save,
    }: {
        children: React.ReactElement;
        initial: History<T, An>;
        save?(v: History<T, An>): void;
    }) {
        const l = useLatest(save);
        const value = useRef<CH<T, An, Tag>>({
            state: initial,
            save: (v) => l.current?.(v),
            listeners: [],
            previewState: null,
            listenersByPath: makePathListenerNode(),
            historyListeners: [],
            historyUp: [],
            queuedChanges: [],
        });
        useEffect(() => {
            if (initial !== value.current.state) {
                value.current.state = initial;
                value.current.listeners.forEach((f) => f());
                notifyAllPaths(value.current.listenersByPath);
            }
        }, [initial]);
        return <Ctx.Provider value={value.current} children={children} />;
    };
};

const makeProvider = <T, Tag extends string = 'type'>(
    Ctx: React.Context<ContextBase<T, T, Tag>>,
) => {
    return function Provide({
        children,
        initial,
        save,
    }: {
        children: React.ReactElement;
        initial: T;
        save?(v: T): void;
    }) {
        const l = useLatest(save);
        const value = useRef<ContextBase<T, T, Tag>>({
            state: initial,
            save: (v) => l.current?.(v),
            listeners: [],
            previewState: null,
            listenersByPath: makePathListenerNode(),
            queuedChanges: [],
        });
        useEffect(() => {
            if (initial !== value.current.state) {
                value.current.state = initial;
                value.current.listeners.forEach((f) => f());
                notifyAllPaths(value.current.listenersByPath);
            }
        }, [initial]);
        return <Ctx.Provider value={value.current} children={children} />;
    };
};

export const makeHistoryContext = <T, An, Tag extends string = 'type'>(tag: Tag) => {
    const Ctx = createContext<CH<T, An, Tag>>(null as any);

    return [
        makeHistoryProvider(Ctx),

        function useStateContext() {
            const ctx = useContext(Ctx);
            if (ctx === null) {
                console.log('got a got');
                throw new Error(`Used a context but its not there`);
            }

            return useMemo(() => {
                const {dispatch, $: $, updateAnnotations} = makeHistoryDispatch(ctx, tag);

                return {
                    onHistoryChange(f: () => void) {
                        ctx.historyListeners.push(f);
                        return () => {
                            const at = ctx.historyListeners.indexOf(f);
                            if (at !== -1) ctx.historyListeners.splice(at, 1);
                        };
                    },
                    latest() {
                        return ctx.state.current;
                    },
                    useHistory() {
                        const [tick, setTick] = useState(0);
                        useEffect(() => {
                            const f = () => setTick((t) => t + 1);
                            ctx.historyUp.push(f);
                            return () => {
                                const at = ctx.historyUp.indexOf(f);
                                if (at !== -1) ctx.historyUp.splice(at, 1);
                            };
                        }, []);
                        return ctx.state;
                    },
                    tip() {
                        return ctx.state.tip;
                    },
                    clearHistory() {
                        ctx.state = clearHistory(ctx.state);
                    },
                    canRedo() {
                        return ctx.state.undoTrail.length > 0;
                    },
                    canUndo() {
                        return ctx.state.tip !== ctx.state.root;
                    },
                    undo() {
                        dispatch({op: 'undo'});
                    },
                    redo() {
                        dispatch({op: 'redo'});
                    },
                    $,
                    updateAnnotations,
                    dispatch,
                };
            }, [ctx, tag]);
        },
    ] as const;
};

const makeDispatch = <T, Tag extends string = 'type'>(ctx: ContextBase<T, T, Tag>, tag: Tag) => {
    // const inner = ctx;
    const extra: Extra = {
        getForPath(path) {
            return _get(ctx.previewState ?? ctx.state, path);
        },
        listenToPath(v, f) {
            addPathListener(ctx.listenersByPath, v, f);
            return () => removePathListener(ctx.listenersByPath, v, f);
        },
    };
    const go = (v: MaybeNested<PendingJsonPatchOp<T, Tag, Extra>>, when?: ApplyTiming) => {
        if (when === 'preview') {
            ctx.queuedChanges.push(...(asFlat(v) as PendingJsonPatchOp<T, Tag, Extra>[]));
            if (ctx.raf == null) {
                ctx.raf = requestAnimationFrame(() => {
                    ctx.raf = undefined;
                    // const base = inner.previewState ?? inner.state.current;
                    const queue = ctx.queuedChanges;
                    ctx.queuedChanges = [];

                    const {current: next, changes} = resolveAndApply(
                        ctx.previewState ?? ctx.state,
                        queue,
                        extra,
                        tag,
                    );

                    if (next === (ctx.previewState ?? ctx.state)) return;
                    const paths = changedPaths(changes);
                    ctx.previewState = next;
                    ctx.listeners.forEach((f) => f());
                    notifyPaths(ctx.listenersByPath, paths);
                });
            }
            return;
        }

        ctx.previewState = null;
        if (ctx.raf != null) {
            cancelAnimationFrame(ctx.raf);
            ctx.raf = undefined;
        }

        const {current: next, changes} = resolveAndApply(ctx.state, v, extra, tag);
        if (next === ctx.state) return;
        const pathTargets = changedPaths(changes);
        ctx.state = next;
        ctx.save(ctx.state);

        ctx.listeners.forEach((f) => f());
        notifyPaths(ctx.listenersByPath, pathTargets);
    };

    return {
        dispatch: go,
        $: diffBuilderApply<T, Extra, Tag>(go, extra, tag),
    };
};

const makeHistoryDispatch = <T, An, Tag extends string = 'type'>(
    ctx: ContextBase<History<T, An>, T, Tag> & ContextHistory,
    tag: Tag,
) => {
    // const inner = ctx;
    const extra: Extra = {
        getForPath(path) {
            return _get(ctx.previewState?.current ?? ctx.state.current, path);
        },
        listenToPath(v, f) {
            addPathListener(ctx.listenersByPath, v, f);
            return () => removePathListener(ctx.listenersByPath, v, f);
        },
    };
    const go = (
        v:
            | {op: 'undo' | 'redo'}
            | {op: 'jump'; id: string}
            | MaybeNested<PendingJsonPatchOp<T, Tag, Extra>>,
        when?: ApplyTiming,
    ) => {
        let hChanged = false;
        if (when === 'preview') {
            if (!Array.isArray(v) && (v.op === 'undo' || v.op === 'redo' || v.op === 'jump')) {
                return; // not previewing those
            }
            ctx.queuedChanges.push(...(asFlat(v) as PendingJsonPatchOp<T, Tag, Extra>[]));
            if (ctx.raf == null) {
                ctx.raf = requestAnimationFrame(() => {
                    ctx.raf = undefined;
                    // const base = inner.previewState?.current ?? inner.state.current;
                    const queue = ctx.queuedChanges;
                    ctx.queuedChanges = [];
                    const next = dispatch(ctx.previewState ?? ctx.state, queue, extra, tag);
                    if (next === ctx.state) return;
                    const paths = changedPaths(next.nodes[next.tip].changes);
                    ctx.previewState = next;
                    ctx.listeners.forEach((f) => f());
                    notifyPaths(ctx.listenersByPath, paths);
                });
            }
            return;
        }

        ctx.previewState = null;
        if (ctx.raf != null) {
            cancelAnimationFrame(ctx.raf);
            ctx.raf = undefined;
        }

        const next = dispatch(ctx.state, v, extra, tag);
        if (next === ctx.state) return;
        const pathTargets = changedPaths(next.nodes[next.tip].changes);
        hChanged = next.nodes !== ctx.state.nodes;
        ctx.state = next;
        ctx.save(ctx.state);

        ctx.listeners.forEach((f) => f());
        notifyPaths(ctx.listenersByPath, pathTargets);

        if (hChanged) {
            ctx.historyListeners.forEach((f) => f());
        }
        ctx.historyUp.forEach((f) => f());
    };

    const updateAnnotations = diffBuilderApply<Annotations<An>, null, Tag>(
        (v: MaybeNested<PendingJsonPatchOp<Annotations<An>, Tag, null>>) => {
            const {current: next} = resolveAndApply<Annotations<An>, null, Tag>(
                ctx.state.annotations,
                v,
                null,
                tag,
            );
            ctx.state.annotations = next;
            ctx.save(ctx.state);
            ctx.historyUp.forEach((f) => f());
        },
        null,
        tag,
    );

    return {
        dispatch: go,
        $: diffBuilderApply<T, Extra, Tag>(go, extra, tag),
        updateAnnotations,
    };
};

const clearHistory = <T, An>(h: History<T, An>): History<T, An> => ({
    ...h,
    undoTrail: [],
    initial: h.current,
    tip: h.root,
    nodes: {[h.root]: h.nodes[h.root]},
});

export const makeContext = <T, Tag extends string = 'type'>(tag: Tag) => {
    const Ctx = createContext<ContextBase<T, T, Tag>>(null as any);

    return [
        makeProvider(Ctx),

        function useStateContext() {
            const ctx = useContext(Ctx);
            if (ctx === null) {
                console.log('got a got');
                throw new Error(`Used a context but its not there`);
            }

            return useMemo(() => {
                const {dispatch, $: $} = makeDispatch(ctx, tag);

                return {
                    latest() {
                        return ctx.state;
                    },
                    $,
                    dispatch,
                };
            }, [ctx, tag]);
        },
    ] as const;
};
