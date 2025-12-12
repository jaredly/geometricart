import equal from 'fast-deep-equal';
import {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {diffBuilderApply, PendingJsonPatchOp} from './helper2';
import {dispatch, History} from './history';
import {MaybeNested} from './make2';
import {useLatest} from '../routes/screens/pattern.screen/editState';

type C<T> = {
    state: T;
    save: (v: T) => void;
    listeners: (() => void)[];
};

export const makeContext = <T, An, Tag extends string = 'type'>(tag: Tag) => {
    const Ctx = createContext<C<History<T, An>>>({
        state: null as any,
        listeners: [],
        save() {},
    });

    return [
        function Provide({
            children,
            initial,
            save,
        }: {
            children: React.ReactElement;
            initial: History<T, An>;
            save(v: History<T, An>): void;
        }) {
            const l = useLatest(save);
            const value = useRef<C<History<T, An>>>({
                state: initial,
                save: (v) => l.current(v),
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
                const go = (v: {op: 'undo' | 'redo'} | MaybeNested<PendingJsonPatchOp<T>>) => {
                    const next = dispatch(ctx.state, v);
                    ctx.state = next;
                    ctx.save(next);
                    ctx.listeners.forEach((f) => f());
                };
                return {
                    use<B>(sel: (t: T) => B, exact = true): B {
                        const lsel = useRef(sel);
                        lsel.current = sel;

                        const [value, setValue] = useState(() => sel(ctx.state.current));
                        const lvalue = useRef(value);
                        lvalue.current = value;

                        useEffect(() => {
                            const fn = () => {
                                const nv = lsel.current(ctx.state.current);
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
                        return ctx.state.current;
                    },
                    clearHistory() {
                        ctx.state = clearHistory(ctx.state);
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
    initial: h.current,
    tip: h.root,
    nodes: {[h.root]: h.nodes[h.root]},
});
