import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import equal from 'fast-deep-equal';
import {diffBuilderApply} from '../../../json-diff/helper';
import {ops} from '../../../json-diff/ops';
import {Coord} from '../../../types';
import {Hover} from './resolveMods';

// type ESM = {
//     current:
// }

const ctx = createContext<EditState>({hover: null, pending: null});

type C<T> = {
    value: T;
};

export const makeContext = <T,>(initial: T) => {
    const listeners: (() => void)[] = [];
    const ctx = createContext<C<T>>({value: initial});
    return {
        use<B>(sel: (t: T) => B, exact = true): B {
            const c = useContext(ctx);
            const lsel = useRef(sel);
            lsel.current = sel;

            const [value, setValue] = useState(() => sel(c.value));
            const lvalue = useRef(value);

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
            }, [c, exact]);

            return value;
        },
        useUpdate() {
            const c = useContext(ctx);

            const update = useMemo(
                () =>
                    diffBuilderApply(
                        () => c.value,
                        (op) => {
                            c.value = ops.apply(c.value, op);
                            listeners.forEach((f) => f());
                        },
                    ),
                [c],
            );

            return update;
        },
        Provide({children}: {children: React.ReactElement}) {
            const value = useMemo<C<T>>(() => ({value: initial}), [initial]);
            return <ctx.Provider value={value} children={children} />;
        },
    };
};

export const editContext = makeContext<EditState>({hover: null, pending: null});
export type EditState = {
    hover: null | Hover;
    pending: {type: 'shape'; points: Coord[]; onDone(points: Coord[]): void} | null;
};
