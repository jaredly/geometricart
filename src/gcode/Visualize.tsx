// ok
import * as React from 'react';
import { State } from '../types';
import { GCode3D } from './GCode3D';
import { renderCutDepths } from './renderCutDepths';

const parseCoords = (line: string) => {
    return [...line.matchAll(/([xyzf])(-?[0-9.]+)/g)].reduce((acc, m) => {
        acc[m[1] as 'x' | 'y' | 'z' | 'f'] = parseFloat(m[2]);
        return acc;
    }, {} as { x?: number; y?: number; z?: number; f?: number });
};

export type Tool = { diameter: number; vbit?: number };

export const parse = (gcode: string): GCodeData['toolPaths'] => {
    const settings = { units: 'in' };
    let pos: { x?: number; y?: number; z?: number; f?: number } = {};
    // if f === -1, then it's a rapid move
    const toolPaths: GCodeData['toolPaths'] = [];
    // const positions: {
    //     x: number;
    //     y: number;
    //     z: number;
    //     f?: number;
    //     tool?: Tool;
    // }[] = [];
    let tool: Tool | undefined = undefined;
    gcode.split('\n').forEach((line) => {
        const good = line.split(';')[0].trim().toLowerCase();
        if (!good.length) {
            return;
        }
        const toolPrefix = `M0 ; tool `;
        if (line.startsWith(toolPrefix)) {
            const [diameter, vbit] = line.slice(toolPrefix.length).split('v');
            tool = {
                diameter: parseFloat(diameter),
                vbit: vbit ? parseFloat(vbit) : undefined,
            };
            toolPaths.push({
                positions: [],
                tool,
            });
            return;
        }
        const g = good.match(/^g([0-9]+)/);
        if (!g) {
            console.warn('bad gcode line', line);
            return;
        }
        switch (g[1]) {
            case '21':
                settings.units = 'mm';
                break;
            case '20':
                settings.units = 'in';
                break;
            case '90':
                break;
            case '91':
                throw new Error(`relative, cant do it`);
            case '0': {
                if (!toolPaths.length) {
                    toolPaths.push({
                        positions: [],
                        tool: { diameter: 3 },
                    });
                }
                const positions = toolPaths[toolPaths.length - 1].positions;
                const coords = parseCoords(good);
                pos = { ...pos, ...coords };
                if (pos.x != null && pos.y != null && pos.z != null) {
                    positions.push({
                        x: pos.x,
                        y: pos.y,
                        z: pos.z,
                        f: -1,
                    });
                }
                break;
            }
            case '1': {
                if (!toolPaths.length) {
                    console.warn('No initial tool');
                    toolPaths.push({
                        positions: [],
                        tool: { diameter: 3 },
                    });
                }
                const positions = toolPaths[toolPaths.length - 1].positions;
                const coords = parseCoords(good);
                pos = { ...pos, ...coords };
                if (pos.x != null && pos.y != null && pos.z != null) {
                    positions.push({
                        x: pos.x,
                        y: pos.y,
                        z: pos.z,
                        f: pos.f,
                    });
                }
            }
        }
    });
    return toolPaths;
};

export const Visualize = ({
    gcode,
    state,
    time,
}: {
    gcode: string;
    state: State;
    time: number;
}) => {
    const bitSize = 3; // mm, 1/8"
    const data = React.useMemo(() => {
        try {
            const toolPaths = parse(gcode);
            const bounds = findBounds(toolPaths, bitSize, 3);
            const dims = {
                width: bounds.max.x! - bounds.min.x!,
                height: bounds.max.y! - bounds.min.y!,
                depth: -bounds.min.z!,
            };
            return { toolPaths, bounds, dims };
        } catch (err) {
            console.error(err);
        }
    }, [gcode]);
    const scale = 10;
    const ref = React.useRef<HTMLCanvasElement>(null);
    const [visualize, setVisualize] = React.useState(false);
    React.useEffect(() => {
        if (!ref.current || !data) {
            return;
        }
        const ctx = ref.current.getContext('2d')!;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-data.bounds.min.x!, -data.bounds.min.y!);

        renderCutDepths(ctx, data);
        renderCutPaths(ctx, data);

        ctx.restore();
    }, [data]);
    if (!data) {
        return <div>Analysis failed</div>;
    }
    return (
        <div>
            {/* <div>{JSON.stringify(data.bounds)}</div> */}
            <canvas
                ref={ref}
                width={data.dims.width * scale}
                height={data.dims.height * scale}
                style={{
                    backgroundColor: 'blue',
                    // width: (data.dims.width * scale) / 2,
                    // height: (data.dims.height * scale) / 2,
                    width: 500 / (data.dims.height / data.dims.width),
                    height: 500,
                }}
            />
            <div>
                <button onClick={() => setVisualize(!visualize)}>
                    {visualize ? `Hide 3d render` : `Show 3d render`}
                </button>
                {visualize ? (
                    <GCode3D
                        data={data}
                        gcode={gcode}
                        state={state}
                        meta={`Time: ${time.toFixed(0)} min. GCode lines: ${
                            gcode.split('\n').length
                        }. ${data.dims.width.toFixed(
                            1,
                        )} x ${data.dims.height.toFixed(
                            1,
                        )} x ${data.dims.depth.toFixed(1)}mm`}
                    />
                ) : null}
            </div>

            <div
                style={{
                    whiteSpace: 'pre',
                    maxHeight: 200,
                    overflow: 'auto',
                    border: '1px solid white',
                    padding: 16,
                }}
            >
                {gcode}
            </div>
        </div>
    );
};

type Bound = {
    min: { x: number | null; y: number | null; z: number | null };
    max: { x: number | null; y: number | null; z: number | null };
};

const ax = ['x', 'y', 'z'] as const;

const findBounds = (
    toolPaths: GCodeData['toolPaths'],
    bitSize: number,
    margin: number,
) => {
    return toolPaths.reduce(
        (acc, { positions }) =>
            positions.reduce((acc, pos) => {
                ax.forEach((k: 'x' | 'y' | 'z') => {
                    if (acc.min[k] == null || pos[k] < acc.min[k]!) {
                        acc.min[k] =
                            k === 'z' ? pos[k] : pos[k] - bitSize / 2 - margin;
                    }
                    if (acc.max[k] == null || pos[k] > acc.max[k]!) {
                        acc.max[k] =
                            k === 'z' ? pos[k] : pos[k] + bitSize / 2 + margin;
                    }
                });
                return acc;
            }, acc),
        {
            min: { x: null, y: null, z: null },
            max: { x: null, y: null, z: null },
        } as Bound,
    );
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

export function renderCutPaths(ctx: CanvasRenderingContext2D, data: GCodeData) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = 'black';
    let above = false;
    data.toolPaths.forEach(({ positions }) => {
        positions.forEach((pos, i) => {
            if (i === 0 || pos.z >= 0 !== above) {
                if (i > 0) {
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                above = pos.z >= 0;
                ctx.strokeStyle = above ? 'red' : 'black';
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        });
    });
    ctx.stroke();
}
