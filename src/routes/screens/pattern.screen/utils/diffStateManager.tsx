import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import equal from 'fast-deep-equal';
import {diffBuilderApply} from '../../../../json-diff/helper2';
import {ops} from '../../../../json-diff/ops2';
import {fromPending} from '../../../../json-diff/make2';

type C<T> = {
    value: T;
};

export const makeContext = <T,>(initial: T) => {
    const listeners: (() => void)[] = [];
    const ctx = createContext<C<T>>({value: initial});

    return [
        function Provide({children}: {children: React.ReactElement}) {
            const value = useMemo<C<T>>(() => ({value: initial}), [initial]);
            return <ctx.Provider value={value} children={children} />;
        },
        function useStateContext() {
            const c = useContext(ctx);

            return useMemo(
                () => ({
                    use<B>(sel: (t: T) => B, exact = true): B {
                        const lsel = useRef(sel);
                        lsel.current = sel;

                        const [value, setValue] = useState(() => sel(c.value));
                        const lvalue = useRef(value);
                        lvalue.current = value;

                        useEffect(() => {
                            const fn = () => {
                                const nv = lsel.current(c.value);
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
                        return c.value;
                    },
                    update: diffBuilderApply<T, null, 'type'>(
                        (op) => {
                            c.value = ops.apply(c.value, fromPending(c.value, op));
                            listeners.forEach((f) => f());
                        },
                        null,
                        'type',
                    ),
                }),
                [c],
            );
        },
    ] as const;
};
