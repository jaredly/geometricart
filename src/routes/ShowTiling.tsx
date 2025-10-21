import {useState} from 'react';
import {angleTo, push} from '../rendering/getMirrorTransforms';
import {Coord, Tiling} from '../types';
import {getPatternData, shapeKey} from './getPatternData';
import {boundsForCoords} from '../editor/Bounds';
import {toEdges} from './patternColoring';
import {useMask} from '@react-three/drei';
import {coordKey} from '../rendering/coordKey';

export const TilingMask = ({
    size,
    hash,
    bounds,
    minSegLength,
}: {
    minSegLength: number;
    size: number;
    hash: string;
    bounds: Coord[];
}) => {
    const margin = 0.5; //minSegLength * 2;
    const x = -1 - margin;
    const w = 2 + margin * 2;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${x} ${x} ${w} ${w}`}
            style={{width: size, height: size}}
            className="absolute inset-0 hover:opacity-100 opacity-0 transition-opacity duration-300"
        >
            <mask id={hash} mask-type="luminance">
                <rect x={x} y={x} width={w} height={w} fill="white" />
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
                x={x}
                y={x}
                width={w}
                height={w}
                fill="white"
                mask={`url(#${hash})`}
                opacity={0.7}
            />
        </svg>
    );
};

export const shapeD = (points: Coord[]) =>
    'M' +
    points
        .map((p) => `${Math.round(p.x * 1000) / 1000} ${Math.round(p.y * 1000) / 1000}`)
        .join('L') +
    'Z';

const TilingShape = ({
    shape,
    minSegLength,
    data,
    i,
    pointNames,
}: {
    i: number;
    data: ReturnType<typeof getPatternData>;
    minSegLength: number;
    shape: Coord[];
    pointNames: Record<string, number>;
}) => {
    const {colorInfo} = data;
    const [hover, setHover] = useState(false);
    const bb = boundsForCoords(...shape);
    // const points = useMask(() => {
    //     if (!hover) return []
    //     return shape.map(coord => )
    // }, [hover])
    return (
        <>
            {shape.length > 80 ? (
                <circle cx={shape[0].x} cy={shape[0].y} r={0.02} fill="red" />
            ) : null}
            <path
                onMouseOver={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                data-skey={shapeKey(shape, minSegLength)}
                fill={
                    hover
                        ? 'white'
                        : colorInfo.colors[data.shapeIds[i]] === -1
                          ? '#444'
                          : `hsl(${
                                (colorInfo.colors[data.shapeIds[i]] / (colorInfo.maxColor + 1)) *
                                360
                            } 100% 50%)`
                }
                // fill="white"
                // fill={`hsl(90 100% ${((i % 6) / 6) * 80 + 20}%)`}
                // opacity={0.1}
                strokeWidth={0.01}
                strokeLinejoin="round"
                stroke="black"
                d={shapeD(shape)}
            />
            {hover ? (
                <>
                    <text
                        fontSize={minSegLength / 2}
                        fill="none"
                        strokeWidth={0.03}
                        strokeLinejoin="round"
                        textAnchor="middle"
                        stroke="black"
                        x={((bb.x1 + bb.x0) / 2).toFixed(3)}
                        y={((bb.y1 + bb.y0) / 2).toFixed(3)}
                        pointerEvents="none"
                    >
                        {i}
                    </text>
                    <text
                        fontSize={minSegLength / 2}
                        fill="white"
                        stroke="none"
                        textAnchor="middle"
                        x={((bb.x1 + bb.x0) / 2).toFixed(3)}
                        y={((bb.y1 + bb.y0) / 2).toFixed(3)}
                        pointerEvents="none"
                    >
                        {i}
                    </text>
                    {shape.map((coord, i) => (
                        <>
                            <circle
                                cx={coord.x.toFixed(3)}
                                cy={coord.y.toFixed(3)}
                                r={minSegLength / 3}
                                fill="red"
                                opacity={0.5}
                            />
                            <text
                                fontSize={minSegLength / 2}
                                stroke="white"
                                strokeWidth={minSegLength}
                                textAnchor="middle"
                                x={coord.x.toFixed(3)}
                                y={coord.y.toFixed(3)}
                                pointerEvents="none"
                            >
                                {pointNames[coordKey(coord)]}
                            </text>
                            <text
                                fontSize={minSegLength / 2}
                                fill="black"
                                stroke="none"
                                textAnchor="middle"
                                x={coord.x.toFixed(3)}
                                y={coord.y.toFixed(3)}
                                pointerEvents="none"
                            >
                                {pointNames[coordKey(coord)]}
                            </text>
                        </>
                    ))}
                </>
            ) : null}
            {shape.length > 80 ? arrows(shape) : null}
        </>
    );
};

export const TilingPattern = ({
    size,
    data,
}: {
    size?: number;
    data: ReturnType<typeof getPatternData>;
    tiling: Tiling;
}) => {
    const [hover, setHover] = useState(null as null | number);
    const {shapes, minSegLength} = data;
    const pointNames = Object.fromEntries(data.uniquePoints.map((p, i) => [coordKey(p), i]));
    return (
        <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="-3 -3 6 6"
                // viewBox="-1.5 -1.5 3 3"
                style={size ? {background: 'black', width: size, height: size} : undefined}
            >
                {shapes.map((shape, i) => (
                    <TilingShape
                        key={i}
                        pointNames={pointNames}
                        i={i}
                        shape={shape}
                        data={data}
                        minSegLength={minSegLength}
                    />
                ))}
                <path
                    fill="none"
                    strokeWidth={minSegLength / 10}
                    strokeLinejoin="round"
                    stroke="yellow"
                    pointerEvents="none"
                    d={shapeD(data.bounds)}
                />
            </svg>
            {hover != null ? (
                <div>
                    Hover {hover}
                    <div>{data.shapeIds[hover]}</div>
                    {/* <div>
                        {toEdges(data.shapePoints[data.shapeIds[hover]])
                            .sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]))
                            .map(([a, b]) => (a < b ? `${a}:${b}` : `${b}:${a}`))
                            // .map(([a, b]) => `${a}:${b}`)
                            .join(' ')}
                    </div> */}
                </div>
            ) : null}
        </div>
    );
};

export const ShowTiling = ({
    hash,
    data,
    size = 300,
    debug,
    tiling,
}: {
    debug?: boolean;
    hash: string;
    size?: number;
    data: ReturnType<typeof getPatternData>;
    tiling: Tiling;
}) => {
    return (
        <div className="relative">
            {debug ? (
                <TilingPattern size={size * 2} data={data} tiling={tiling} />
            ) : (
                <img src={`/gallery/pattern/${hash}/300/png`} style={{width: size, height: size}} />
            )}
            {!debug ? (
                <TilingMask
                    minSegLength={data.minSegLength}
                    size={size}
                    bounds={data.bounds}
                    hash={hash}
                />
            ) : null}
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
