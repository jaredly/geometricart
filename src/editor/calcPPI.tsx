export const calcPPI = (ppi: number, pixels: number, zoom: number) => {
    return `${(pixels / ppi).toFixed(3)}in`;
};
