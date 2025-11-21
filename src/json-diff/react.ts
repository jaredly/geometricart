import {useCallback, useState} from 'react';
import {redo, State, undo, update} from './state';
import {JsonPatchOp} from './types';

type MaybeNested<T> = T | MaybeNested<T>[];

export function useDiffState<T>(initial: State<T>) {
    const [state, setState] = useState(initial);
    const dispatch = useCallback((nested: {op: 'undo' | 'redo'} | MaybeNested<JsonPatchOp<T>>) => {
        if (!Array.isArray(nested)) {
            if (nested.op === 'undo') {
                return setState(undo);
            } else if (nested.op === 'redo') {
                return setState(redo);
            }
        }
        const ops = (Array.isArray(nested) ? nested.flat() : [nested]) as JsonPatchOp<T>[];
        setState((state) => update(state, ops));
    }, []);
    return [state, dispatch];
}
