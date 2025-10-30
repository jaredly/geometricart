export type LineColors = {
    [key: string]: {
        count: number;
        color: string | number;
        width?: number;
    };
};

export type FillColors = {
    [key: string]: {
        count: number;
        color: string | number;
        lighten?: number;
    };
};
