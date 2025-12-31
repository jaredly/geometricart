import {useState, useRef, useEffect} from 'react';

// import {example3} from './example3';
// biome-ignore lint: any is fine here
export const usePromise = <T,>(f: (abort: AbortSignal) => Promise<T>, deps: any[] = []) => {
    const [v, setV] = useState<{type: 'res'; value: T} | {type: 'err'; error: Error} | null>(null);
    const lv = useRef(f);
    lv.current = f;
    useEffect(() => {
        const ctrl = new AbortController();
        lv.current(ctrl.signal).then(
            (v) => setV({type: 'res', value: v}),
            (e) => setV({type: 'err', error: e}),
        );
        return () => ctrl.abort();
        // biome-ignore lint: this is fine
    }, deps);
    return v;
};
