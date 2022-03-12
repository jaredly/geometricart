import * as React from 'react';
import { insetArcArc } from '../src/rendering/inset/arcArc';
import { lineLine, lineToSlope } from '../src/rendering/intersect';
import { Fixtures } from './Fixtures';
import fixtures from './arcArc.json';
import { insetPrev, naiveInset } from '../src/rendering/ShowDebugInsetSegment';
import { RenderSegmentBasic } from '../src/editor/RenderSegment';
import { Arrow, pointsList } from '../src/editor/ShowHitIntersection2';
import { angleTo, dist, push } from '../src/rendering/getMirrorTransforms';
import { ArcSegment, Coord, Segment } from '../src/types';
import { Fixture } from '../src/vest/types';
import { CoordEditor } from '../src/rendering/inset/CoordEditor';
import { Slider } from '../src/rendering/inset/Slider';

type I = [[Coord, Coord, Coord, boolean, boolean], number];
const Input = ({
    input: [[prev, one, two], inset],
    onChange,
    scale,
}: {
    input: InputT;
    scale: number;
    onChange?: (i: InputT) => void;
}) => {
    // const [prev, one, two] = newToOld([p1, p2, p3, c1, c2]);
    const [p1, p2, p3, c1, c2] = oldToNew([prev, one, two]);
    return (
        <>
            <RenderSegmentBasic
                prev={prev}
                segment={one}
                inner={{
                    stroke: 'red',
                    strokeWidth: 2 * scale,
                    fill: 'none',
                }}
            />
            <RenderSegmentBasic
                prev={one.to}
                segment={two}
                inner={{
                    stroke: 'red',
                    strokeWidth: 2 * scale,
                    fill: 'none',
                }}
            />
            <line
                x1={0}
                x2={300}
                y1={150}
                y2={150}
                stroke="black"
                strokeDasharray={'1 2'}
                strokeWidth={1 * scale}
            />
            <line
                y1={0}
                y2={300}
                x1={150}
                x2={150}
                stroke="black"
                strokeDasharray={'1 2'}
                strokeWidth={1 * scale}
            />
            <CoordEditor
                coords={[p1, p2, p3]}
                margin={0}
                onClick={
                    onChange
                        ? (idx, evt) => {
                              if (idx === 0) {
                                  onChange([
                                      newToOld([p1, p2, p3, !c1, c2]),
                                      inset,
                                  ]);
                              } else if (idx === 2) {
                                  onChange([
                                      newToOld([p1, p2, p3, c1, !c2]),
                                      inset,
                                  ]);
                              }
                          }
                        : undefined
                }
                constrain={(coord) => ({
                    x: Math.abs(coord.x - 150) < 10 ? 150 : coord.x,
                    y: Math.abs(coord.y - 150) < 10 ? 150 : coord.y,
                })}
                onSet={([p1, p2, p3]) =>
                    onChange
                        ? onChange([newToOld([p1, p2, p3, c1, c2]), inset])
                        : null
                }
            />
            {onChange ? (
                <Slider
                    inset={inset}
                    onChange={(inset) =>
                        onChange([newToOld([p1, p2, p3, c1, c2]), inset])
                    }
                />
            ) : null}
        </>
    );
};

const Output = ({
    output: segments,
    input: [[prev, one, two], inset],
    scale,
}: {
    input: InputT;
    output: Array<Segment>;
    scale: number;
}) => {
    const coords = oldToNew([prev, one, two]);
    // const [prev, one, two] = newToOld(coords);
    const naive = naiveInset({ prev: one.to, segment: two, shape: -1 }, inset);
    return (
        <>
            <g style={{ pointerEvents: 'none' }}>
                <RenderSegmentBasic
                    prev={segments[segments.length - 1].to}
                    segment={naive.segment}
                    inner={{
                        stroke: 'green',
                        strokeWidth: 1 * scale,
                        strokeDasharray: '5 5',
                    }}
                />
                {segments.map((seg, i) => (
                    <RenderSegmentBasic
                        key={i}
                        prev={
                            i === 0
                                ? insetPrev(prev, one, inset)
                                : segments[i - 1].to
                        }
                        segment={seg}
                        inner={{ stroke: 'green', strokeWidth: 2 * scale }}
                    />
                ))}
            </g>
        </>
    );
};

type InputI = [[Coord, Coord, Coord, boolean, boolean], number];
type InputT = [[Coord, ArcSegment, ArcSegment], number];
export const oldToNew = ([, one, two]: InputT[0]): InputI[0] => {
    return [one.center, one.to, two.center, one.clockwise, two.clockwise];
};

export const newToOld = ([
    center,
    to,
    twoCenter,
    oneClock,
    twoClock,
]: InputI[0]): InputT[0] => {
    const r = dist(center, to);
    const t = angleTo(center, to);
    const prev = push(center, t + ((oneClock ? -1 : 1) * Math.PI) / 2, r);
    return [
        prev,
        { type: 'Arc', clockwise: oneClock, center, to },
        {
            type: 'Arc',
            clockwise: twoClock,
            center: twoCenter,
            to: push(
                twoCenter,
                angleTo(twoCenter, to) + ((twoClock ? 1 : -1) * Math.PI) / 2,
                dist(twoCenter, to),
            ),
        },
    ];
};
export const ArcArc = () => (
    <Fixtures
        Input={Input}
        editDelay={100}
        Output={Output}
        run={insetArcArc}
        fixtures={fixtures as Array<Fixture<typeof insetArcArc>>}
    />
);
