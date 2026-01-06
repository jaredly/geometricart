export const addToMap = <T,>(map: Record<string | number, T[]>, k: string | number, t: T) => {
    if (!map[k]) map[k] = [t];
    else map[k].push(t);
};
