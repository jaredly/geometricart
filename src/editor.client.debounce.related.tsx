
export let tid: NodeJS.Timeout | null = null;

export const debounce = (fn: () => Promise<void>, time: number): (() => void) => {
    if (tid != null) {
        clearTimeout(tid);
    }
    tid = setTimeout(() => {
        tid = null;
        fn();
    }, time);
    return () => {
        if (tid != null) {
            clearTimeout(tid);
            tid = null;
            fn();
        }
    };
};