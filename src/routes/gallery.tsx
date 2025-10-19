import {useMemo} from 'react';
import {applyTilingTransforms, getTransform, tilingPoints} from '../editor/tilingPoints';
import {tilingTransforms} from '../editor/tilingTransforms';
import {coordKey} from '../rendering/coordKey';
import {angleTo, applyMatrices, push} from '../rendering/getMirrorTransforms';
import {Coord, Tiling} from '../types';
import {Route} from './+types/gallery';
import {getAllPatterns} from './db.server';
import {cutSegments, shapesFromSegments, unique} from './shapesFromSegments';

export async function loader(_: Route.LoaderArgs) {
    return getAllPatterns();
}

const ShowTiling = ({
    tiling,
    data: {allSegments, shapes, bounds},
}: {
    tiling: Tiling;
    data: {allSegments: [Coord, Coord][]; shapes: Coord[][]; bounds: Coord[]};
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-2 -2 4 4"
            style={{background: 'black', width: 1000, height: 1000}}
        >
            {/* <path
                fill="rgb(100,255,100,0.2)"
                d={bounds
                    .map(({x, y}, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`)
                    .join(' ')}
            /> */}
            {allSegments.map(([a, b]) => (
                <path
                    stroke="green"
                    strokeWidth={0.01}
                    d={`M${a.x.toFixed(3)} ${a.y.toFixed(3)} L${b.x.toFixed(3)} ${b.y.toFixed(3)}`}
                />
            ))}
            {tiling.cache.segments.map((seg) => {
                // const off = push(
                //     seg.segment.to,
                //     angleTo(seg.prev, seg.segment.to) + (Math.PI * 8) / 9,
                //     0.05,
                // );
                // const st = push(seg.prev, angleTo(seg.prev, seg.segment.to), 0.02);
                return (
                    <>
                        {/* <circle cx={seg.prev.x} cy={seg.prev.y} r={0.03} fill="red" /> */}
                        <path
                            stroke="#00ff00"
                            // opacity={0.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeWidth={0.01}
                            fill="none"
                            d={`M${seg.prev.x.toFixed(3)} ${seg.prev.y.toFixed(3)} L${seg.segment.to.x.toFixed(3)} ${seg.segment.to.y.toFixed(3)}`}
                            //     d={`M${st.x.toFixed(3)} ${st.y.toFixed(3)} L${seg.segment.to.x.toFixed(3)} ${seg.segment.to.y.toFixed(3)}
                            // L${off.x.toFixed(3)} ${off.y.toFixed(3)}
                            // `}
                        />
                        {/* <circle
                        cx={seg.segment.to.x}
                        cy={seg.segment.to.y}
                        r={0.05}
                        fill="blue"
                        opacity={0.5}
                    /> */}
                    </>
                );
            })}
            {shapes.slice(6, 8).map((shape, i) => (
                <>
                    {shape.length === 100 ? (
                        <circle cx={shape[0].x} cy={shape[0].y} r={0.02} fill="red" />
                    ) : null}
                    <path
                        fill={`hsl(90 100% ${((i % 6) / 6) * 80 + 20}%)`}
                        opacity={0.5}
                        strokeWidth={0.005}
                        stroke="black"
                        d={
                            'M' +
                            shape.map((p) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('L') +
                            'Z'
                        }
                    />
                    {shape.length === 100 || true
                        ? shape.map((p, i) => {
                              if (i === 0) return;
                              const t = angleTo(shape[i - 1], p);
                              const n = push(p, t, 0.04);
                              const b = push(p, t, -0.01);
                              const o = push(p, t + Math.PI / 2, 0.01);
                              const l = push(p, t + Math.PI / 2, -0.01);
                              // return <circle cx={p.x} cy={p.y} r={0.02} fill="red" />;
                              return (
                                  <path
                                      fill="red"
                                      // strokeWidth={0.01}
                                      d={
                                          'M' +
                                          [n, o, b, l]
                                              .map((p) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
                                              .join('L') +
                                          'Z'
                                      }
                                  />
                              );
                          })
                        : null}
                </>
            ))}
            <path
                stroke="red"
                fill="none"
                strokeWidth={0.01}
                d={
                    bounds
                        .map(({x, y}, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`)
                        .join(' ') + 'Z'
                }
            />
        </svg>
    );
};

// 11e20b0b5c2acf8fbe077271c9dab02fd69ea419
// DEBUG THIS ONE
// also this one
// 3ec9815442a44a060745e6e3388f64f7c14a3787 -- split lines that intersect
//
// 11e20b0b5c2acf8fbe077271c9dab02fd69ea419
export const Gallery = ({loaderData}: Route.ComponentProps) => {
    const data = useMemo(() => {
        console.time();
        const res = Object.fromEntries(
            loaderData
                .filter((t) => t.hash === '11e20b0b5c2acf8fbe077271c9dab02fd69ea419')
                // loaderData.slice(0, 100)
                .map(({tiling, hash}) => {
                    const pts = tilingPoints(tiling.shape);
                    const tx = getTransform(pts);
                    const bounds = pts.map((pt) => applyMatrices(pt, tx));

                    const ttt = tilingTransforms(tiling.shape, bounds[2], bounds);
                    const eigenSegments = tiling.cache.segments.map(
                        (s) => [s.prev, s.segment.to] as [Coord, Coord],
                    );
                    const allSegments = applyTilingTransforms(eigenSegments, ttt);
                    const eigenPoints = unique(eigenSegments.flat(), coordKey);

                    // const splitted = cutSegments(allSegments);
                    const shapes = shapesFromSegments(allSegments, eigenPoints);
                    return [hash, {bounds, shapes, pts, allSegments}];
                }),
        );
        console.timeEnd();
        return res;
    }, [loaderData]);
    return (
        <div>
            <h1> Galley page </h1>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                {loaderData.map((item) =>
                    data[item.hash] ? (
                        <div key={item.hash}>
                            <div style={{fontSize: 8}}>{item.hash}</div>
                            <ShowTiling tiling={item.tiling} data={data[item.hash]} />
                        </div>
                    ) : null,
                )}
            </div>
        </div>
    );
};
export default Gallery;
