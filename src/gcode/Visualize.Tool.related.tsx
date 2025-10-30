
export type Tool = {diameter: number; vbit?: number};

export type Bound = {
    min: {x: number | null; y: number | null; z: number | null};
    max: {x: number | null; y: number | null; z: number | null};
};

export type GCodeData = {
    toolPaths: {
        tool: Tool;
        positions: {
            x: number;
            y: number;
            z: number;
            f?: number | undefined;
        }[];
    }[];
    bounds: Bound;
    dims: {
        width: number;
        height: number;
        depth: number;
    };
};