declare module 'png-metadata' {
    export type Chunk = {name: string; data: Uint8Array};
    export type RESOLUTION_UNITS = 0 | 1 | 2;
    export type Metadata = {
        tEXt: {[key: string]: string};
        pHYs: {x: number; y: number; units: RESOLUTION_UNITS};
    };
    export const extractChunks: (data: Uint8Array) => Array<Chunk>;
    export const insertMetadata: (chunks: Array<Chunk>, metadata: Partial<Metadata>) => void;
    export const encodeChunks: (chunks: Array<Chunk>) => Uint8Array;
    export const readMetadata: (data: Uint8Array) => Metadata;
}
