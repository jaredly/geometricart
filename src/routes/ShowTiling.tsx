import {useState} from 'react';
import {angleTo, push} from '../rendering/getMirrorTransforms';
import {Coord, Tiling} from '../types';
import {getPatternData, shapeBoundsKey} from './getPatternData';
import {boundsForCoords} from '../editor/Bounds';
import {coordKey} from '../rendering/coordKey';
import {shapeD} from './shapeD';
import {cmpCoords, midPoint} from './shapesFromSegments';

const TilingMask = ({size, hash, bounds}: {size: number; hash: string; bounds: Coord[]}) => {
    const margin = 0.5; //minSegLength * 2;
    const x = -1 - margin;
    const w = 2 + margin * 2;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${x} ${x} ${w} ${w}`}
            style={{width: size, height: size}}
            className="absolute inset-0 opacity-0 transition-opacity duration-300 tiling-mask pointer-events-none"
        >
            {/* <mask id={hash} mask-type="luminance">
                <rect x={x} y={x} width={w} height={w} fill="white" />
                <path fill="black" d={shapeD(bounds)} />
            </mask>
            <rect
                x={x}
                y={x}
                width={w}
                height={w}
                fill="white"
                mask={`url(#${hash})`}
                opacity={0.6}
            /> */}
            <path stroke="black" fill="none" strokeWidth={0.02} d={shapeD(bounds)} />
            <path stroke="white" fill="none" strokeWidth={0.01} d={shapeD(bounds)} />
        </svg>
    );
};

const TilingShape = ({
    shape,
    minSegLength,
    data,
    i,
    pointNames,
    setHover,
    hover,
}: {
    hover: boolean;
    i: number;
    data: ReturnType<typeof getPatternData>;
    minSegLength: number;
    shape: Coord[];
    pointNames: Record<string, number>;
    setHover: (i: number | null) => void;
}) => {
    const {colorInfo} = data;
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
                onMouseOver={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                data-skey={shapeBoundsKey(shape, minSegLength)}
                fill={
                    hover
                        ? 'white'
                        : colorInfo.colors[i] === -1
                          ? '#444'
                          : `hsl(${
                                (colorInfo.colors[i] / (colorInfo.maxColor + 1)) * 360
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

            {shape.length > 80 ? arrows(shape) : null}
        </>
    );
};

export const TilingPattern = ({
    size,
    data,
    showLines,
    showWoven,
    showShapes = true,
    showBounds,
    debug,
    // tiling,
}: {
    debug?: boolean;
    size?: number;
    data: ReturnType<typeof getPatternData>;
    tiling: Tiling;
    showLines?: boolean;
    showWoven?: boolean;
    showShapes?: boolean;
    showBounds?: boolean;
}) => {
    // const flip = flipPattern(tiling);
    const [hover, setHover] = useState(null as null | number);
    const {shapes, minSegLength} = data;
    const pointNames = Object.fromEntries(data.uniquePoints.map((p, i) => [coordKey(p), i]));

    // const corners = chooseCorner(tiling.shape.type === 'parallellogram' ? tiling.shape.points : [], data.shapes)
    let hoverNodes: React.ReactNode | null = null;
    if (hover != null) {
        const shape = shapes[hover];
        const i = hover;
        const bb = boundsForCoords(...shape);

        hoverNodes = (
            <g pointerEvents={'none'}>
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
                            strokeWidth={0.03}
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
            </g>
        );
    }

    const lines: React.ReactNode[] = [];
    const texts: React.ReactNode[] = [];
    if (showLines) {
        const byColor = data.allSegments
            .map((seg, i) => ({seg, path: data.paths[i].pathId, i}))
            .sort((a, b) =>
                a.path === b.path
                    ? cmpCoords(a.seg[0], b.seg[0])
                    : a.path == null
                      ? -1
                      : b.path == null
                        ? 1
                        : a.path - b.path,
            );

        byColor.forEach(({seg: [a, b], path, i}) => {
            // const paint = new pk.Paint();
            // paint.setStyle(pk.PaintStyle.Stroke);
            // paint.setStrokeWidth(data.minSegLength / 2);
            // paint.setStrokeCap(pk.StrokeCap.Round);
            // paint.setColor(path == null ? [0, 0, 0] : hslToHex((path % 12) * 30, 100, 50));
            const mid = midPoint(a, b);
            lines.push(
                // <path
                //     key={`lines-${i}`}
                //     d={shapeD([a, b], false)}
                //     stroke={'black'}
                //     strokeWidth={data.minSegLength / 2}
                //     // strokeLinecap="round"
                // />,
                <path
                    key={`linesx-${i}`}
                    d={shapeD([a, b], false)}
                    data-path={path}
                    // opacity={0.5}
                    // stroke="white"
                    stroke={path == null ? 'white' : `hsl(${(path % 12) * 30} 100% 50%)`}
                    strokeWidth={data.minSegLength / 2}
                    strokeLinecap="round"
                />,
            );
            // texts.push(
            //     <text
            //         x={mid.x}
            //         y={mid.y}
            //         fontSize={data.minSegLength / 3}
            //         strokeWidth={data.minSegLength / 10}
            //         strokeLinejoin="round"
            //         textAnchor="middle"
            //         stroke="white"
            //     >
            //         {i}
            //     </text>,
            //     <text x={mid.x} y={mid.y} textAnchor="middle" fontSize={data.minSegLength / 3}>
            //         {i}
            //     </text>,
            // );

            // if (path != null) {
            //     texts.push(
            //         <text
            //             x={mid.x}
            //             y={mid.y}
            //             fontSize={data.minSegLength / 3}
            //             strokeWidth={data.minSegLength / 10}
            //             strokeLinejoin="round"
            //             textAnchor="middle"
            //             stroke="white"
            //         >
            //             {path ?? '-'}
            //         </text>,
            //         <text x={mid.x} y={mid.y} textAnchor="middle" fontSize={data.minSegLength / 3}>
            //             {path ?? '-'}
            //         </text>,
            //     );
            // }
        });
    }

    // data.allSegments.forEach((seg, i) => {
    //     const mid = midPoint(...seg);
    //     texts.push(
    //         <text
    //             x={mid.x}
    //             y={mid.y}
    //             fontSize={data.minSegLength / 3}
    //             strokeWidth={data.minSegLength / 10}
    //             strokeLinejoin="round"
    //             textAnchor="middle"
    //             stroke="white"
    //         >
    //             {i}
    //         </text>,
    //         <text x={mid.x} y={mid.y} textAnchor="middle" fontSize={data.minSegLength / 3}>
    //             {i}
    //         </text>,
    //     );
    // });

    if (data.woven && showWoven) {
        data.woven.forEach(({points, pathId, order, isBack}, i) => {
            lines.push(
                // ...points.map((path, j) => (
                //     <path
                //         key={`lines-${i}-${j}`}
                //         d={shapeD(path, false)}
                //         stroke={'black'}
                //         strokeWidth={data.minSegLength / 1.5}
                //         strokeLinecap="butt"
                //         // opacity={0.5}
                //         fill="none"
                //     />
                // )),
                ...points.map((path, j) => (
                    <path
                        key={`linesx-${i}-${j}`}
                        d={shapeD(path, false)}
                        stroke={
                            // isBack ? 'black' : `white`
                            // isBack ? 'black' : `hsl(${((order + 2) / 3) * 330} 100% 50%)`
                            // order === -1
                            //     ? 'red'
                            //     : order === 0
                            //       ? 'blue'
                            //       : order === 1
                            //         ? 'green'
                            //         : 'yellow'
                            isBack ? 'black' : 'rgb(205,127,1)'
                        }
                        fill="none"
                        // strokeLinecap={isBack ? 'butt' : 'round'}
                        // opacity={0.8}
                        strokeWidth={isBack ? data.minSegLength / 1.5 : data.minSegLength / 3}
                    />
                )),
            );
            // texts.push(
            //     <text
            //         x={mid.x}
            //         y={mid.y}
            //         fontSize={data.minSegLength / 3}
            //         strokeWidth={data.minSegLength / 10}
            //         strokeLinejoin="round"
            //         textAnchor="middle"
            //         stroke="white"
            //     >
            //         {order}
            //     </text>,
            //     <text x={mid.x} y={mid.y} textAnchor="middle" fontSize={data.minSegLength / 3}>
            //         {order}
            //     </text>,
            // );

            // const pathb = pk.Path.MakeFromCmds(
            //     points.flatMap((path) =>
            //         path.flatMap((p, i) => [
            //             i === 0 ? pk.MOVE_VERB : pk.LINE_VERB,
            //             p.x + off,
            //             p.y + off,
            //         ]),
            //     ),
            // )!;
            // ctx.drawPath(pathb, back);

            // const path = pk.Path.MakeFromCmds(
            //     points.flatMap((path) =>
            //         path.flatMap((p, i) => [i === 0 ? pk.MOVE_VERB : pk.LINE_VERB, p.x, p.y]),
            //     ),
            // )!;

            // ctx.drawPath(path, front);
        });
    }

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            // viewBox="-5 -5 10 10"
            // viewBox="-3 -3 6 6"
            viewBox="-1.5 -1.5 3 3"
            style={size ? {background: 'black', width: size, height: size} : undefined}
        >
            {showShapes &&
                (!debug
                    ? shapes.map((shape, i) => (
                          <path
                              key={i}
                              d={shapeD(shape)}
                              fill={
                                  data.colorInfo.colors[i] === -1
                                      ? '#444'
                                      : //   : `hsl(${
                                        //         (data.colorInfo.colors[i] /
                                        //             (data.colorInfo.maxColor + 1)) *
                                        //         360
                                        //     } 100% 50%)`
                                        `hsl(100 0% ${
                                            (
                                                data.colorInfo.colors[i] /
                                                    (data.colorInfo.maxColor + 1)
                                            ) *
                                                40 +
                                            30
                                        }%)`
                                  // `hsl(37 ${
                                  //     (data.colorInfo.colors[i] /
                                  //         data.colorInfo.maxColor) *
                                  //     100
                                  // }% 40%)`
                              }
                              stroke="black"
                              strokeWidth={data.minSegLength / 5}
                          />
                      ))
                    : shapes.map((shape, i) => (
                          <TilingShape
                              hover={hover === i}
                              setHover={setHover}
                              key={i}
                              pointNames={pointNames}
                              i={i}
                              shape={shape}
                              data={data}
                              minSegLength={minSegLength}
                          />
                      )))}
            {/* {tiling.cache.segments.map(({prev, segment}) => (
                    <path
                        d={shapeD([prev, segment.to])}
                        fill="none"
                        stroke="black"
                        strokeWidth={0.03}
                    />
                ))}
                {flip.cache.segments.map(({prev, segment}) => (
                    <path
                        d={shapeD([prev, segment.to])}
                        fill="none"
                        stroke="green"
                        strokeWidth={0.03}
                    />
                ))} */}
            {/* {data.allSegments.map((seg) => (
                    <path d={shapeD(seg)} fill="none" stroke="green" strokeWidth={0.1} />
                ))} */}
            {data.outer ? (
                <path
                    d={shapeD(data.outer)}
                    fill="none"
                    stroke="rgba(0,0,0)"
                    strokeWidth={data.minSegLength / 2}
                />
            ) : null}
            {/* {corners} */}
            {lines}
            {texts}
            {hoverNodes}
            {showBounds ? (
                <>
                    {' '}
                    <path
                        fill="none"
                        strokeWidth={0.02}
                        strokeLinejoin="round"
                        stroke="black"
                        pointerEvents="none"
                        d={shapeD(data.bounds)}
                    />
                    <path
                        fill="none"
                        strokeWidth={0.01}
                        strokeLinejoin="round"
                        stroke="yellow"
                        pointerEvents="none"
                        d={shapeD(data.bounds)}
                    />{' '}
                </>
            ) : null}
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
    data: {bounds: Coord[]};
}) => {
    return (
        <div
            className="relative"
            css={{
                '&:hover > .tiling-mask': {opacity: 1},
            }}
        >
            <img
                src={`/gallery/pattern/${hash}/${size * 2}.png`}
                style={{width: size, height: size}}
            />
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
