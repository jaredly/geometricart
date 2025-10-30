import * as React from 'react';

export const useOnChange = <T,>(v: T, fn: (v: T) => void) => {
    const prev = React.useRef(v);
    React.useEffect(() => {
        if (prev.current !== v) {
            prev.current = v;
            fn(v);
        }
    }, [v]);
};

export const useInitialState = <T, R = T>(
    v: T,
    transform?: (t: T) => R,
): [R, React.Dispatch<React.SetStateAction<R>>] => {
    const [current, set] = React.useState(transform ? transform(v) : (v as any as R));
    useOnChange(v, (v) => set(transform ? transform(v) : (v as any as R)));
    return [current, set];
};
