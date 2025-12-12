import equal from 'fast-deep-equal';
import {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {diffBuilderApply, PendingJsonPatchOp} from './helper2';
import {dispatch, History} from './history';
import {MaybeNested} from './make2';

type C<T> = {
    state: T;
    save: (v: T) => void;
};

export const makeContext = <T, An, Tag extends string = 'type'>(tag: Tag) => {
    const listeners: (() => void)[] = [];
    const Ctx = createContext<C<History<T, An>>>({state: null as any, save() {}});

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
            const value = useMemo<C<History<T, An>>>(
                () => ({state: initial, save}),
                [initial, save],
            );
            return <Ctx.Provider value={value} children={children} />;
        },

        function useStateContext() {
            const ctx = useContext(Ctx);

            return useMemo(() => {
                const go = (v: {op: 'undo' | 'redo'} | MaybeNested<PendingJsonPatchOp<T>>) => {
                    const next = dispatch(ctx.state, v);
                    ctx.state = next;
                    ctx.save(next);
                    listeners.forEach((f) => f());
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
                            listeners.push(fn);
                            return () => {
                                const idx = listeners.indexOf(fn);
                                listeners.splice(idx, 1);
                            };
                        }, [exact]);

                        return value;
                    },
                    latest() {
                        return ctx.state.current;
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
