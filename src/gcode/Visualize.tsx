// ok
import * as React from 'react';

const parseCoords = (line: string) => {
    return [...line.matchAll(/([xyzf])(-?[0-9.]+)/g)].reduce((acc, m) => {
        acc[m[1] as 'x' | 'y' | 'z' | 'f'] = parseFloat(m[2]);
        return acc;
    }, {} as { x?: number; y?: number; z?: number; f?: number });
};

const parse = (gcode: string) => {
    const settings = { units: 'in' };
    let pos: { x?: number; y?: number; z?: number; f?: number } = {};
    // if f === -1, then it's a rapid move
    const positions: { x: number; y: number; z: number; f?: number }[] = [];
    gcode.split('\n').forEach((line) => {
        const good = line.split(';')[0].trim().toLowerCase();
        if (!good.length) {
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
                const coords = parseCoords(good);
                pos = { ...pos, ...coords };
                if (pos.x != null && pos.y != null && pos.z != null) {
                    positions.push({ x: pos.x, y: pos.y, z: pos.z, f: -1 });
                }
                break;
            }
            case '1': {
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
    return positions;
};

export const Visualize = ({ gcode }: { gcode: string }) => {
    const data = React.useMemo(() => {
        try {
            const positions = parse(gcode);
            const bounds = findBounds(positions);
            const dims = {
                width: bounds.max.x! - bounds.min.x!,
                height: bounds.max.y! - bounds.min.y!,
            };
            return { positions, bounds, dims };
        } catch (err) {
            console.error(err);
        }
    }, [gcode]);
    const scale = 10;
    const ref = React.useRef<HTMLCanvasElement>(null);
    React.useEffect(() => {
        if (!ref.current || !data) {
            return;
        }
        drawGCodeToCanvas(ref.current, scale, data);
    }, [data]);
    if (!data) {
        return <div>Analysis failed</div>;
    }
    return (
        <div>
            <div>{JSON.stringify(data.bounds)}</div>
            <canvas
                ref={ref}
                width={data.dims.width * scale}
                height={data.dims.height * scale}
                style={{
                    backgroundColor: 'black',
                    width: (data.dims.width * scale) / 2,
                    height: (data.dims.height * scale) / 2,
                }}
            />
            <div
                style={{
                    whiteSpace: 'pre',
                    maxHeight: 400,
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
    positions: { x: number; y: number; z: number; f?: number }[],
) => {
    return positions.reduce(
        (acc, pos) => {
            ax.forEach((k: 'x' | 'y' | 'z') => {
                if (acc.min[k] == null || pos[k] < acc.min[k]!) {
                    acc.min[k] = pos[k];
                }
                if (acc.max[k] == null || pos[k] > acc.max[k]!) {
                    acc.max[k] = pos[k];
                }
            });
            return acc;
        },
        {
            min: { x: null, y: null, z: null },
            max: { x: null, y: null, z: null },
        } as Bound,
    );
};

function drawGCodeToCanvas(
    ref: HTMLCanvasElement,
    scale: number,
    data: {
        positions: {
            x: number;
            y: number;
            z: number;
            f?: number | undefined;
        }[];
        bounds: Bound;
        dims: { width: number; height: number };
    },
) {
    const bitSize = 3; // mm, 1/8"
    const ctx = ref.getContext('2d')!;
    ctx.save();
    ctx.clearRect(0, 0, ref.width, ref.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = bitSize;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'darken';
    let z = null as null | number;
    ctx.scale(scale, scale);
    const depth = 0 - data.bounds.min.z!;
    data.positions.forEach((pos, i) => {
        if (pos.z != z) {
            if (z != null) {
                ctx.stroke();
            }
            z = pos.z;
            ctx.strokeStyle = `rgb(${Math.round(
                ((Math.min(0, z) - data.bounds.min.z!) / depth) * 255,
            )}, 255, 255)`;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        } else {
            ctx.lineTo(pos.x, pos.y);
        }
    });
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = 'black';
    let above = false;
    data.positions.forEach((pos, i) => {
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
    ctx.stroke();
    ctx.restore();
}
