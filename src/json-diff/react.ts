import {useCallback, useState} from 'react';
import {JsonPatchOp} from './types';
import {ops} from './ops';

type MaybeNested<T> = T | MaybeNested<T>[];
type History<T> = {ops: JsonPatchOp<T>[]; ts: number}[];

export function useDiffState<T>(initial: T, history: History<T>[]) {
    const [state, setState] = useState({value: initial, history});
    const update = useCallback((...nested: MaybeNested<JsonPatchOp<T>>[]) => {
        const update = nested.flat() as JsonPatchOp<T>[];
        setState((state) => {
            const history = state.history.concat([{ops: update, ts: Date.now()}]);
            let value = state.value;
            update.forEach((op) => {
                value = ops.apply(value, op);
            });
            return {value, history};
        });
    }, []);
    return [state, update];
}
