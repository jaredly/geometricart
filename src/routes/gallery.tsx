import {useLoaderData} from 'react-router';
import {Route} from './+types/gallery';
import {getAllPatterns} from './db.server';
import {SimpleTiling} from '../editor/SimpleTiling';
// import {ShowTiling} from '../editor/ShowTiling';
import {Coord, Tiling} from '../types';
import {applyTilingTransforms, getTransform, tilingPoints} from '../editor/tilingPoints';
import {boundsForCoords} from '../editor/Bounds';
import {angleTo, applyMatrices, push} from '../rendering/getMirrorTransforms';
import {tilingTransforms} from '../editor/tilingTransforms';
import {coordKey} from '../rendering/coordKey';
import {angleBetween} from '../rendering/isAngleBetween';
import {coordsEqual} from '../rendering/pathsAreIdentical';

export async function loader(_: Route.LoaderArgs) {
    return getAllPatterns();
}

const addToMap = <T,>(map: Record<string, T[]>, k: string, t: T) => {
    if (!map[k]) map[k] = [t];
    else map[k].push(t);
};

const shapesFromSegments = (segs: [Coord, Coord][], eigenPoints: Coord[]) => {
    const byEndPoint: Record<string, {idx: number; theta: number; to: Coord}[]> = {};
    segs.forEach((seg, i) => {
        if (coordsEqual(seg[0], seg[1])) {
            console.warn('zero-length seg, ignoring');
            return;
        }
        const to = angleTo(seg[0], seg[1]);
        const from = angleTo(seg[1], seg[0]);
        addToMap(byEndPoint, coordKey(seg[0]), {idx: i, theta: to, to: seg[1]});
        addToMap(byEndPoint, coordKey(seg[1]), {idx: i, theta: from, to: seg[0]});
    });

    const used: Record<string, true> = {};
    const shapes: Coord[][] = [];
    eigenPoints.forEach((point) => {
        const segs = byEndPoint[coordKey(point)];
        if (!segs) {
            console.warn(`no segs from point`, point);
            return;
        }
        for (const seg of segs) {
            const sk = `${coordKey(point)}:${coordKey(seg.to)}`;
            if (used[sk]) continue;
            // console.log(`Start at ${coordKey(point)}`);
            let at = seg;
            const points = [point, seg.to];
            while (points.length < 100) {
                // console.log(points, at);
                const nexts = byEndPoint[coordKey(at.to)]
                    .filter((seg) => !coordsEqual(seg.to, points[points.length - 2]))
                    .map((seg) => ({
                        seg,
                        cctheta: angleBetween(at.theta + Math.PI, seg.theta, true),
                    }))
                    .sort((a, b) => a.cctheta - b.cctheta);

                if (!nexts.length) {
                    break;
                }
                // console.log(`At ${coordKey(at.to)}`);
                // console.log(nexts.map((n) => (n.cctheta * 180) / Math.PI));
                const next = nexts[0];

                const sk = `${coordKey(at.to)}:${coordKey(next.seg.to)}`;
                if (used[sk]) {
                    console.warn(`somehow double-using a segment`, sk);
                }
                used[sk] = true;

                if (coordsEqual(points[0], next.seg.to)) {
                    break;
                }

                at = next.seg;
                points.push(at.to);
            }
            if (points.length === 100) {
                console.warn('bad news, shape is bad');
                continue;
            }
            shapes.push(points);
        }
    });
    return shapes;
};

const unique = <T,>(l: T[], k: (t: T) => string) => {
    const seen: Record<string, boolean> = {};
    return l.filter((t) => {
        const key = k(t);
        return seen[key] ? false : (seen[key] = true);
    });
};

const ShowTiling = ({tiling}: {tiling: Tiling}) => {
    const pts = tilingPoints(tiling.shape);
    const tx = getTransform(pts);
    const bounds = pts.map((pt) => applyMatrices(pt, tx));
    const {x0, y0, x1, y1} = boundsForCoords(...pts);
    const w = x1 - x0;
    const h = y1 - y0;
    const m = Math.min(w, h) / 10;

    const ttt = tilingTransforms(tiling.shape, bounds[2], bounds);
    const eigenSegments = tiling.cache.segments.map(
        (s) => [s.prev, s.segment.to] as [Coord, Coord],
    );
    const allSegments = applyTilingTransforms(eigenSegments, ttt);
    const eigenPoints = unique(eigenSegments.flat(), coordKey);

    const shapes = shapesFromSegments(allSegments, eigenPoints);

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
            {shapes.map((shape, i) => (
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
                    {shape.length === 100
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
export const Gallery = ({loaderData}: Route.ComponentProps) => {
    return (
        <div>
            <h1> Galley page </h1>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                {loaderData.slice(0, 10).map((item) => (
                    <div key={item.hash}>
                        <div style={{fontSize: 8}}>{item.hash}</div>
                        <ShowTiling tiling={item.tiling} />
                    </div>
                ))}
            </div>
        </div>
    );
};
export default Gallery;
