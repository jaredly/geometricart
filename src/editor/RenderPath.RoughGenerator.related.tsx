export class RoughGenerator {
    path(raw: string, options: any): 'path' {
        return 'path';
    }
    toPaths(paths: 'path'): {stroke: string; d: string; fill: string; strokeWidth: string}[] {
        return [];
    }
}

export class RoughCanvas extends RoughGenerator {
    generator: RoughGenerator;
    constructor(canvas: any) {
        super();
        this.generator = null as any;
    }
}
