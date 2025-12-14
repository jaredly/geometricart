import equal from 'fast-deep-equal';
import {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
    ApplyTiming,
    diffBuilderApply,
    DiffNodeA,
    getExtra,
    getPath,
    Path,
    PendingJsonPatchOp,
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
};

export type Extra = {
    getForPath<T>(v: Path): T;
    listenToPath(v: Path, f: () => void): () => void;
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
                const extra: Extra = {
                    getForPath(path) {
                        return _get(ctx.state.current, path);
                    },
                    listenToPath(v, f) {
                        // TODO
                        return () => {};
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
                                const queue = ctx.queuedChanges;
                                ctx.queuedChanges = [];
                                const next = dispatch(
                                    ctx.previewState ?? ctx.state,
                                    queue,
                                    extra,
                                    tag,
                                );
                                if (next === ctx.state) return;
                                ctx.previewState = next;
                                ctx.listeners.forEach((f) => f());
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
                    hChanged = next.nodes !== ctx.state.nodes;
                    ctx.state = next;
                    ctx.save(ctx.state);

                    ctx.listeners.forEach((f) => f());
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
