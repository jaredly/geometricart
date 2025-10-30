
export const makeEven = (v: number) => {
    v = Math.ceil(v);
    return v % 2 === 0 ? v : v + 1;
};