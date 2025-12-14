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
import {blankHistory, dispatch, History} from './history';
import {asFlat, MaybeNested, resolveAndApply} from './make2';
import {useLatest} from '../routes/screens/pattern.screen/editState';
import {_get} from './internal2';

type C<T> = {
    state: T;
    save: (v: T) => void;
    listeners: (() => void)[];
};

type CH<T, An, Tag extends string = 'type'> = {
    state: History<T, An>;
    save: (v: History<T, An>) => void;
    listeners: (() => void)[];
    historyListeners: (() => void)[];
    historyUp: (() => void)[];
    previewState: null | History<T, An>;
    queuedChanges: PendingJsonPatchOp<T, Tag, Extra>[];
    raf?: number;
    listenersByPath: PathListenerNode;
};

export type Extra = {
    getForPath<T>(v: Path): T;
    listenToPath(v: Path, f: () => void): () => void;
};

type PathListener = () => void;

// Trie-ish structure so we can grab all listeners for a path (and its descendants)
// with a single lookup; writes pay the cost of updating ancestor aggregates.
type PathListenerNode = {
    listeners: Set<PathListener>;
    subtree: Set<PathListener>;
    children: Map<string, PathListenerNode>;
};

const makePathListenerNode = (): PathListenerNode => ({
    listeners: new Set(),
    subtree: new Set(),
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
    root.subtree.add(listener);
    let node = root;
    for (const seg of path) {
        const key = segmentKey(seg);
        let child = node.children.get(key);
        if (!child) {
            child = makePathListenerNode();
            node.children.set(key, child);
        }
        child.subtree.add(listener);
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
    stack.forEach(({node: n}) => n.subtree.delete(listener));
    for (let i = stack.length - 1; i > 0; i--) {
        const {node: child, key} = stack[i];
        const parent = stack[i - 1].node;
        if (child.subtree.size === 0 && child.children.size === 0 && child.listeners.size === 0) {
            parent.children.delete(key as string);
        }
    }
};

const collectListenersForPath = (root: PathListenerNode, path: Path, out: Set<PathListener>) => {
    let node: PathListenerNode = root;
    for (const seg of path) {
        const next = node.children.get(segmentKey(seg));
        if (!next) return;
        node = next;
    }
    node.subtree.forEach((l) => out.add(l));
};

const notifyPaths = (root: PathListenerNode, paths: Path[]) => {
    if (!paths.length) return;
    const listeners = new Set<PathListener>();
    paths.forEach((p) => collectListenersForPath(root, p, listeners));
    listeners.forEach((l) => l());
};

const notifyAllPaths = (root: PathListenerNode) => {
    root.subtree.forEach((l) => l());
};

const isUndoOrRedo = (
    v: {op: 'undo' | 'redo'} | MaybeNested<PendingJsonPatchOp<unknown, any, any>>,
): v is {op: 'undo' | 'redo'} => !Array.isArray(v) && (v.op === 'undo' || v.op === 'redo');

const changedPaths = <T, Extra, Tag extends string = 'type'>(
    current: T,
    pending: MaybeNested<PendingJsonPatchOp<T, Tag, Extra>>,
    extra: Extra,
    tag: Tag,
) => {
    const {changes} = resolveAndApply(current, pending, extra, tag);
    const paths: Path[] = [];
    changes.forEach((op: JsonPatchOp<T>) => {
        paths.push(op.path);
        if (op.op === 'move') paths.push(op.from);
    });
    return paths;
};

export const useValue = <Current,>(node: DiffNodeA<unknown, Current, any, unknown, Extra>) => {
    const path = getPath(node);
    const extra = getExtra(node);
    const [v, setV] = useState(() => extra.getForPath<Current>(path));
    const lv = useLatest(v);
    useEffect(
        () =>
            extra.listenToPath(path, () => {
                const nw = extra.getForPath<Current>(path);
                if (lv.current !== nw) {
                    lv.current = nw;
                    setV(nw);
                }
            }),
        [extra, path, lv],
    );
    return v;
};

export const makeHistoryContext = <T, An, Tag extends string = 'type'>(tag: Tag) => {
    const Ctx = createContext<CH<T, An, Tag>>({
        state: blankHistory(null as any),
        historyListeners: [],
        historyUp: [],
        previewState: null,
        listenersByPath: makePathListenerNode(),
        save(v) {},
        listeners: [],
        queuedChanges: [],
    });

    return [
        function Provide({
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
                historyListeners: [],
                listeners: [],
                historyUp: [],
                previewState: null,
                queuedChanges: [],
                listenersByPath: makePathListenerNode(),
            });
            useEffect(() => {
                if (initial !== value.current.state) {
                    value.current.state = initial;
                    value.current.listeners.forEach((f) => f());
                    notifyAllPaths(value.current.listenersByPath);
                }
            }, [initial]);
            return <Ctx.Provider value={value.current} children={children} />;
        },

        function useStateContext() {
            const ctx = useContext(Ctx);

            return useMemo(() => {
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
                    v: {op: 'undo' | 'redo'} | MaybeNested<PendingJsonPatchOp<T, Tag, Extra>>,
                    when?: ApplyTiming,
                ) => {
                    let hChanged = false;
                    if (when === 'preview') {
                        if (!Array.isArray(v) && (v.op === 'undo' || v.op === 'redo')) {
                            return; // not previewing those
                        }
                        ctx.queuedChanges.push(
                            ...(asFlat(v) as PendingJsonPatchOp<T, Tag, Extra>[]),
                        );
                        if (ctx.raf == null) {
                            ctx.raf = requestAnimationFrame(() => {
                                ctx.raf = undefined;
                                const base = ctx.previewState?.current ?? ctx.state.current;
                                const queue = ctx.queuedChanges;
                                ctx.queuedChanges = [];
                                const next = dispatch(
                                    ctx.previewState ?? ctx.state,
                                    queue,
                                    extra,
                                    tag,
                                );
                                if (next === ctx.state) return;
                                const paths = changedPaths(base, queue, extra, tag);
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

                    const pathTargets = isUndoOrRedo(v)
                        ? null
                        : changedPaths(ctx.state.current, v, extra, tag);
                    const next = dispatch(ctx.state, v, extra, tag);
                    if (next === ctx.state) return;
                    hChanged = next.nodes !== ctx.state.nodes;
                    ctx.state = next;
                    ctx.save(ctx.state);

                    ctx.listeners.forEach((f) => f());
                    if (pathTargets) {
                        notifyPaths(ctx.listenersByPath, pathTargets);
                    } else {
                        notifyAllPaths(ctx.listenersByPath);
                    }
                    if (hChanged) {
                        ctx.historyListeners.forEach((f) => f());
                    }
                    ctx.historyUp.forEach((f) => f());
                };
                return {
                    use<B>(sel: (t: T) => B, exact = true): B {
                        const lsel = useRef(sel);
                        lsel.current = sel;

                        const [value, setValue] = useState(() =>
                            sel(ctx.previewState?.current ?? ctx.state.current),
                        );
                        const lvalue = useRef(value);
                        lvalue.current = value;

                        useEffect(() => {
                            const fn = () => {
                                const nv = lsel.current(
                                    ctx.previewState?.current ?? ctx.state.current,
                                );
                                if (exact ? nv !== lvalue.current : !equal(nv, lvalue.current)) {
                                    setValue(nv);
                                }
                            };
                            ctx.listeners.push(fn);
                            return () => {
                                const idx = ctx.listeners.indexOf(fn);
                                ctx.listeners.splice(idx, 1);
                            };
                        }, [exact]);

                        return value;
                    },
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
                        go({op: 'undo'});
                    },
                    redo() {
                        go({op: 'redo'});
                    },
                    update: diffBuilderApply<T, Extra, Tag>(go, extra, tag),
                    dispatch: go,
                };
            }, [ctx, tag]);
        },
    ] as const;
};

const clearHistory = <T, An>(h: History<T, An>): History<T, An> => ({
    ...h,
    undoTrail: [],
    initial: h.current,
    tip: h.root,
    nodes: {[h.root]: h.nodes[h.root]},
});

export const makeContext = <T, Tag extends string = 'type'>(tag: Tag) => {
    const Ctx = createContext<C<T>>(null as any);

    type Extra = null;
    let extra = null;

    return [
        function Provide({
            children,
            initial,
            save,
        }: {
            children: React.ReactElement;
            initial: T;
            save?(v: T): void;
        }) {
            const l = useLatest(save);
            const value = useRef<C<T>>({
                state: initial,
                save: (v) => l.current?.(v),
                listeners: [],
            });
            useEffect(() => {
                if (initial !== value.current.state) {
                    value.current.state = initial;
                    value.current.listeners.forEach((f) => f());
                }
            }, [initial]);
            return <Ctx.Provider value={value.current} children={children} />;
        },

        function useStateContext() {
            const ctx = useContext(Ctx);

            return useMemo(() => {
                const go = (v: MaybeNested<PendingJsonPatchOp<T, Tag, Extra>>) => {
                    const {current: next} = resolveAndApply<T, Extra, Tag>(
                        ctx.state,
                        v,
                        extra,
                        tag,
                    );
                    if (next === ctx.state) return;
                    ctx.state = next;
                    ctx.save(next);
                    ctx.listeners.forEach((f) => f());
                };
                return {
                    use<B>(sel: (t: T) => B, exact = true): B {
                        const lsel = useRef(sel);
                        lsel.current = sel;

                        const [value, setValue] = useState(() => sel(ctx.state));
                        const lvalue = useRef(value);
                        lvalue.current = value;

                        useEffect(() => {
                            const fn = () => {
                                const nv = lsel.current(ctx.state);
                                if (exact ? nv !== lvalue.current : !equal(nv, lvalue.current)) {
                                    setValue(nv);
                                }
                            };
                            ctx.listeners.push(fn);
                            return () => {
                                const idx = ctx.listeners.indexOf(fn);
                                ctx.listeners.splice(idx, 1);
                            };
                        }, [exact]);

                        return value;
                    },
                    latest() {
                        return ctx.state;
                    },
                    update: diffBuilderApply<T, Extra, Tag>(go, extra, tag),
                    dispatch: go,
                };
            }, [ctx, tag]);
        },
    ] as const;
};
