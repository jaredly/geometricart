export const pxToIn = (value: number, ppi: number) => value / ppi;
export const inToPX = (value: number, ppi: number) => value * ppi;

export const pxToMM = (value: number, ppi: number) => {
    return (value / ppi) * 25.4;
};

export const mmToPX = (value: number, ppi: number) => {
    return (value / 25.4) * ppi;
};
