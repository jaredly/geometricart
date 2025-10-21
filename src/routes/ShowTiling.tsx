import {angleTo, push} from '../rendering/getMirrorTransforms';
import {Coord, Tiling} from '../types';
import {getPatternData} from './getPatternData';

export const TilingMask = ({size, hash, bounds}: {size: number; hash: string; bounds: Coord[]}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-1.5 -1.5 3 3"
            style={{width: size, height: size}}
            className="absolute inset-0 hover:opacity-100 opacity-0 transition-opacity duration-300"
        >
            <mask id={hash} mask-type="luminance">
                <rect x="-1.5" y="-1.5" width="3" height="3" fill="white" />
                <path
                    fill="black"
                    d={
                        bounds
                            .map(
                                ({x, y}, i) =>
                                    `${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`,
                            )
                            .join(' ') + 'Z'
                    }
                />
            </mask>
            <rect
                x="-1.5"
                y="-1.5"
                width="3"
                height="3"
                fill="white"
                mask={`url(#${hash})`}
                opacity={0.7}
            />
        </svg>
    );
};

export const TilingPattern = ({
    size,
    data: {shapes, minSegLength},
}: {
    size?: number;
    data: {shapes: Coord[][]; minSegLength: number};
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-1.5 -1.5 3 3"
            style={size ? {background: 'black', width: size, height: size} : undefined}
        >
            {shapes.map((shape, i) => (
                <>
                    {shape.length > 80 ? (
                        <circle cx={shape[0].x} cy={shape[0].y} r={0.02} fill="red" />
                    ) : null}
                    <path
                        fill={`hsl(90 100% ${((i % 6) / 6) * 80 + 20}%)`}
                        opacity={0.5}
                        strokeWidth={minSegLength / 3}
                        stroke="black"
                        d={
                            'M' +
                            shape.map((p) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('L') +
                            'Z'
                        }
                    />
                    {shape.length > 80 ? arrows(shape) : null}
                </>
            ))}
        </svg>
    );
};

export const ShowTiling = ({
    hash,
    data,
    size = 300,
}: {
    hash: string;
    size?: number;
    data: ReturnType<typeof getPatternData>;
}) => {
    return (
        <div className="relative">
            <img src={`/gallery/pattern/${hash}/png`} style={{width: size, height: size}} />
            {/* <TilingPattern size={size} data={data} /> */}
            <TilingMask size={size} bounds={data.bounds} hash={hash} />
        </div>
    );
};

const arrows = (shape: Coord[]) => {
    return shape.map((p, i) => {
        if (i === 0) return;
        const t = angleTo(shape[i - 1], p);
        const n = push(p, t, 0.04);
        const b = push(p, t, -0.01);
        const o = push(p, t + Math.PI / 2, 0.01);
        const l = push(p, t + Math.PI / 2, -0.01);
        return (
            <path
                fill="red"
                d={
                    'M' +
                    [n, o, b, l].map((p) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('L') +
                    'Z'
                }
            />
        );
    });
};
