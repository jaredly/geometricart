export function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export const ease = (at: number) => {
    at *= 2;
    if (at < 1) {
        return at < 0.1 ? 0 : at > 0.9 ? 1 : easeInOutCubic((at - 0.1) / 0.9);
    }
    at -= 1;
    return 1 - (at < 0.1 ? 0 : at > 0.9 ? 1 : easeInOutCubic((at - 0.1) / 0.9));
};
