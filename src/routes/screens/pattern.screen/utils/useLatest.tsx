import {useRef} from 'react';

export const useLatest = <T,>(v: T) => {
    const l = useRef(v);
    l.current = v;
    return l;
};
