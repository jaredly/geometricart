import {angleTo, push} from '../rendering/getMirrorTransforms';
import {Tiling, Coord} from '../types';
import {getPatternData} from './getPatternData';

export const ShowTiling = ({
    tiling,
    data: {allSegments, shapes, bounds, marks},
    size = 300,
}: {
    tiling: Tiling;
    size?: number;
    data: ReturnType<typeof getPatternData>;
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-2 -2 4 4"
            style={{background: 'black', width: size, height: size}}
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
            {tiling.cache.segments.map((seg, i) => {
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
                            data-eidx={i}
                            stroke={marks.includes(i) ? 'red' : '#00ff00'}
                            // opacity={0.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeWidth={0.01}
                            fill="none"
                            d={`M${seg.prev.x.toFixed(3)} ${seg.prev.y.toFixed(3)} L${seg.segment.to.x.toFixed(3)} ${seg.segment.to.y.toFixed(3)}`}
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
                    {shape.length > 80 ? (
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
                    {shape.length > 80
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
