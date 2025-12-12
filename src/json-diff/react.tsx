import equal from 'fast-deep-equal';
import {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ApplyTiming, diffBuilderApply, PendingJsonPatchOp} from './helper2';
import {dispatch, History} from './history';
import {MaybeNested, resolveAndApply} from './make2';
import {useLatest} from '../routes/screens/pattern.screen/editState';

type C<T> = {
    state: T;
    save: (v: T) => void;
    listeners: (() => void)[];
};

type CH<T> = {
    state: T;
    save: (v: T) => void;
    listeners: (() => void)[];
    historyListeners: (() => void)[];
    historyUp: (() => void)[];
    previewState: null | T;
};

export const makeHistoryContext = <T, An, Tag extends string = 'type'>(tag: Tag) => {
    const Ctx = createContext<CH<History<T, An>>>(null as any);

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
            const value = useRef<CH<History<T, An>>>({
                state: initial,
                save: (v) => l.current?.(v),
                historyListeners: [],
                listeners: [],
                historyUp: [],
                previewState: null,
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
                const go = (
                    v: {op: 'undo' | 'redo'} | MaybeNested<PendingJsonPatchOp<T>>,
                    when?: ApplyTiming,
                ) => {
                    let hChanged = false;
                    if (when === 'preview') {
                        const next = dispatch(ctx.previewState ?? ctx.state, v);
                        if (next === ctx.state) return;
                        ctx.previewState = next;
                    } else {
                        ctx.previewState = null;

                        const next = dispatch(ctx.state, v);
                        if (next === ctx.state) return;
                        hChanged = next.nodes !== ctx.state.nodes;
                        ctx.state = next;
                        ctx.save(ctx.state);
                    }

                    ctx.listeners.forEach((f) => f());
                    if (when !== 'preview') {
                        if (hChanged) {
                            ctx.historyListeners.forEach((f) => f());
                        }
                        ctx.historyUp.forEach((f) => f());
                    }
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
                    update: diffBuilderApply<T, Tag>(go, tag),
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
                const go = (v: MaybeNested<PendingJsonPatchOp<T>>) => {
                    const {current: next} = resolveAndApply<T>(ctx.state, v, tag);
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
                    update: diffBuilderApply<T, Tag>(go, tag),
                    dispatch: go,
                };
            }, [ctx, tag]);
        },
    ] as const;
};
