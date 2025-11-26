/**
 * - congruent/parallel line segments
 * - measure/compare distances
 * - measure/compare angles
 * - congruent distances (excluding line segments)
 * - congruent angles
 */

import React, {useCallback, useMemo, useState} from 'react';
import {mulPos} from '../../../animation/mulPos';
import {coordKey} from '../../../rendering/coordKey';
import {closeEnoughAngle} from '../../../rendering/epsilonToZero';
import {
    angleTo,
    applyMatrices,
    dist,
    translationMatrix,
} from '../../../rendering/getMirrorTransforms';
import {intersections, lineToSlope, Primitive} from '../../../rendering/intersect';
import {angleBetween} from '../../../rendering/isAngleBetween';
import {Coord, Tiling} from '../../../types';
import {findCommonFractions, showFract} from '../../findCommonFractions';
import {getNewPatternData} from '../../getPatternData';
import {humanReadableRatio} from '../../humanReadableRatio';
import {shapeD} from '../../shapeD';
import {unique} from '../../shapesFromSegments';
import {filterNull} from './filterNull';
import {IGuide} from './IGuide';
import {ShowLabel} from './ShowLabel';
import {svgCoord, useElementZoom} from './useSVGZoom';

type Selection = {type: 'shape'; i: number} | {type: 'seg'; i: number};

const findRotated = (points: Coord[]) => {
    const keys = points
        .map((_, i) => {
            const rotpoints = points.slice(i).concat(points.slice(0, i));
            const mx = [translationMatrix(mulPos(rotpoints[0], {x: -1, y: -1}))];
            return rotpoints
                .map((p) => applyMatrices(p, mx))
                .map((c) => coordKey(c))
                .join(';');
        })
        .sort();
    return keys[0];
};

const boxCrop = (cs: number) => ({
    rough: true,
    segments: [
        {type: 'Line', to: {x: cs, y: -cs}},
        {type: 'Line', to: {x: -cs, y: -cs}},
        {type: 'Line', to: {x: -cs, y: cs}},
        {type: 'Line', to: {x: cs, y: cs}},
    ],
});

export const PatternInspect = ({tiling}: {tiling: Tiling}) => {
    const size = 800;
    const [psize, setPsize] = useState(3);
    const data = useMemo(() => getNewPatternData(tiling, psize), [tiling, psize]);

    const [guides, setGuides] = useState([] as IGuide[]);

    const [pending, setPending] = useState(null as null | {type: IGuide['type']; points: Coord[]});
    const [mouse, setMouse] = useState(null as null | Coord);

    const allPoints = useMemo(
        () =>
            unique(
                data.allSegments.flat().concat(data.bounds).concat(allGuideIntersections(guides)),
                coordKey,
            ),
        [data.allSegments, data.bounds, guides],
    );

    const onPoint = useCallback(
        (coord: Coord) => {
            if (!pending) return;
            const points = pending.points.concat([coord]);
            if (points.length >= 2) {
                setGuides((g) =>
                    addSelected(
                        [...g, {type: pending.type, p1: points[0], p2: points[1]}],
                        g.length,
                    ),
                );
                setPending({type: pending.type, points: []});
            } else {
                setPending({...pending, points});
            }
        },
        [pending],
    );
    const [hover, setHover] = useState(null as null | number);

    const pendingPair =
        pending?.points.length === 2
            ? pending.points
            : pending?.points.length === 1 && mouse != null
              ? [pending.points[0], mouse]
              : null;
    const pendingGuide: IGuide | null =
        pending && pendingPair
            ? {type: pending.type, p1: pendingPair[0], p2: pendingPair[1]}
            : null;

    const labels = useMemo(() => getLabels(guides), [guides]);

    const toggle = useCallback((i: number) => {
        setGuides((guides) => {
            if (guides[i].selected == null) {
                return addSelected(guides, i);
            }
            return guides.map((g, j) => (j === i ? {...g, selected: undefined} : g));
        });
    }, []);

    // const boxSize = 6;
    const {zoomProps, box} = useElementZoom(6);
    // const boxSize = 10;
    // const boxSize = 3;

    return (
        <div className="flex">
            <div className="relative overflow-hidden">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    {...zoomProps}
                    style={size ? {background: 'black', width: size, height: size} : undefined}
                    onMouseLeave={() => setMouse(null)}
                    onMouseMove={(evt) => setMouse(svgCoord(evt))}
                >
                    <AllShapes data={data} />
                    {/* {data.shapes.map((shape, i) => (
                        <path d={shapeD(shape)} key={i} fill={shapeColor(data, i)} stroke="none" />
                    ))} */}
                    <path
                        d={shapeD(data.bounds)}
                        stroke="white"
                        strokeWidth={0.02}
                        fill="none"
                        opacity={0.4}
                        strokeDasharray={'0.02 0.05'}
                        pointerEvents={'none'}
                    />
                    {pending &&
                        allPoints.map((coord, i) => (
                            <circle
                                key={i}
                                cx={coord.x}
                                cy={coord.y}
                                r={data.minSegLength / 5}
                                opacity={0.1}
                                className="hover:opacity-100 cursor-pointer"
                                onClick={() => onPoint(coord)}
                                fill="white"
                            />
                        ))}
                    <AllGuides guides={guides} hover={hover} toggle={toggle} setHover={setHover} />
                    {pendingGuide ? (
                        <RenderGuide hover={true} guide={pendingGuide} color="gold" />
                    ) : null}
                </svg>
                {labels.map((label) => {
                    return (
                        <ShowLabel
                            setHover={setHover}
                            label={label}
                            box={box}
                            size={size}
                            hover={hover}
                        />
                    );
                })}
            </div>
            <div className="bg-base-300 p-4 flex-1 flex flex-col">
                <label>
                    Pattern Size
                    <input
                        value={psize}
                        type="number"
                        min="1"
                        max="7"
                        className="input w-12 mx-4"
                        onChange={(evt) => {
                            const num = +evt.target.value;
                            setPsize(Number.isFinite(num) ? Math.min(Math.max(1, num), 7) : 1);
                        }}
                    />
                </label>
                <div className="bg-base-200 rounded-md mt-4">
                    <h2 className="text-xl flex justify-between p-0 items-center">
                        <div className="p-3">Marks</div>
                        <div>
                            <button
                                onClick={() =>
                                    pending?.type === 'line'
                                        ? setPending(null)
                                        : setPending({type: 'line', points: []})
                                }
                                className={`btn ${pending?.type === 'line' ? 'btn-accent' : ''}`}
                            >
                                Line
                            </button>
                            <button
                                onClick={() =>
                                    pending?.type === 'circle'
                                        ? setPending(null)
                                        : setPending({type: 'circle', points: []})
                                }
                                className={`btn ${pending?.type === 'circle' ? 'btn-accent' : ''}`}
                            >
                                Circle
                            </button>
                        </div>
                    </h2>
                    <div className="max-h-160 overflow-auto">
                        <table className="table">
                            <tbody>
                                {guides.map((guide, i) => (
                                    <tr
                                        key={i}
                                        className={i === hover ? 'bg-base-300' : ''}
                                        onMouseEnter={() => setHover(i)}
                                        onMouseLeave={() => setHover(null)}
                                    >
                                        <td>
                                            <input
                                                className="checkbox"
                                                type="checkbox"
                                                checked={guide.selected != null}
                                                onChange={(evt) => {
                                                    if (!evt.target.checked) {
                                                        setGuides((g) =>
                                                            g.map((g) =>
                                                                g === guide
                                                                    ? {
                                                                          ...guide,
                                                                          selected: undefined,
                                                                      }
                                                                    : g,
                                                            ),
                                                        );
                                                    } else {
                                                        setGuides((g) => addSelected(g, i));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td>#{i + 1}</td>
                                        <td>{guide.type}</td>

                                        <td>
                                            <button
                                                className="btn"
                                                onClick={() =>
                                                    setGuides((g) => g.filter((g) => g !== guide))
                                                }
                                            >
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const guideMidpoint = (guide: IGuide) => {
    if (guide.type === 'circle') {
        return guide.p1;
    }
    return halfway(guide.p1, guide.p2);
};

const halfway = (one: Coord, two: Coord) => ({x: (one.x + two.x) / 2, y: (one.y + two.y) / 2});

const guideToPrimitive = (one: IGuide): Primitive =>
    one.type === 'line'
        ? lineToSlope(one.p1, one.p2, true)
        : {
              type: 'circle',
              center: one.p1,
              radius: dist(one.p1, one.p2),
          };

const allGuideIntersections = (guides: IGuide[]) => {
    const coords: Coord[] = [];
    const prims = guides.map(guideToPrimitive);
    for (let i = 0; i < prims.length; i++) {
        const gi = prims[i];
        for (let j = i + 1; j < prims.length; j++) {
            const gj = prims[j];
            coords.push(...intersections(gi, gj));
        }
    }
    return coords;
};

const getLabels = (guides: IGuide[]) => {
    // guides = guides.filter((g) => g.selected != null).sort((a, b) => a.selected! - b.selected!);
    // console.log('labesl', guides);
    const res: {
        left: number;
        right: number;
        label: {angle?: string; lengths: {left: string; right: string}};
        pos: Coord;
    }[] = [];
    for (let i = 0; i < guides.length; i++) {
        const gi = guides[i];
        if (gi.selected == null) continue;
        for (let j = i + 1; j < guides.length; j++) {
            const gj = guides[j];
            if (gj.selected == null) continue;
            const label = getLabel(gi, gj);
            if (label) {
                res.push({
                    label,
                    pos: halfway(guideMidpoint(gi), guideMidpoint(gj)),
                    left: j,
                    right: i,
                });
            }
        }
    }
    return res;
};

const showAngle = (angle: number) => {
    if (closeEnoughAngle(angle, 0)) {
        return '∥';
    }
    if (closeEnoughAngle(angle, Math.PI / 2)) {
        return '⊾';
    }
    const fract = findCommonFractions(angle / Math.PI);
    if (fract) {
        return showFract(fract) + 'π';
    }
    return (angle / Math.PI) * 180 + 'º';
};

const getLabel = (one: IGuide, two: IGuide) => {
    const d1 = dist(one.p1, one.p2);
    const d2 = dist(two.p1, two.p2);
    const rat = humanReadableRatio(d1, d2);
    if (one.type === 'line' && two.type === 'line') {
        let angle = angleBetween(angleTo(one.p1, one.p2), angleTo(two.p1, two.p2), true);
        if (angle > Math.PI) {
            angle = Math.PI * 2 - angle;
        }
        if (angle > Math.PI / 2) {
            angle = Math.PI - angle;
        }
        return {angle: showAngle(angle), lengths: rat};
    }
    return {lengths: rat};
};

const addSelected = (guides: IGuide[], i: number, max = 3) => {
    let current = guides
        .map((g, i) => (g.selected != null ? {s: g.selected, i} : null))
        .filter(filterNull)
        .sort((a, b) => a.s - b.s)
        .map((s) => s.i);
    current.push(i);
    if (current.length > max) {
        current = current.slice(-max);
    }
    return guides.map((g, i) =>
        current.includes(i) ? {...g, selected: current.indexOf(i)} : {...g, selected: undefined},
    );
};

const RenderGuide = React.memo(
    ({
        guide,
        color,
        hover,
        setHover,
        toggle,
        i,
    }: {
        i?: number;
        hover: boolean;
        setHover?: (i: number | null) => void;
        guide: IGuide;
        color?: string;
        toggle?: (i: number) => void;
    }) =>
        guide.type === 'line' ? (
            <line
                fill="none"
                stroke={color ?? 'white'}
                strokeWidth={hover ? 0.02 : 0.005}
                pointerEvents={i != null ? undefined : 'none'}
                onMouseEnter={() => setHover?.(i ?? null)}
                onMouseLeave={() => setHover?.(null)}
                onClick={() => toggle && i != null && toggle(i)}
                x1={guide.p1.x}
                y1={guide.p1.y}
                x2={guide.p2.x}
                y2={guide.p2.y}
                cursor={'pointer'}
            />
        ) : (
            <circle
                cx={guide.p1.x}
                cy={guide.p1.y}
                r={dist(guide.p1, guide.p2)}
                fill="none"
                pointerEvents={i != null ? undefined : 'none'}
                onMouseEnter={() => setHover?.(i ?? null)}
                onMouseLeave={() => setHover?.(null)}
                onClick={() => toggle && i != null && toggle(i)}
                stroke={color ?? 'white'}
                strokeWidth={hover ? 0.02 : 0.005}
                // pointerEvents={'none'}
                cursor={'pointer'}
            />
        ),
);

function shapeColor(data: ReturnType<typeof getNewPatternData>, i: number): string | undefined {
    return data.colorInfo.colors[i] === -1
        ? '#444'
        : `hsl(100 0% ${(data.colorInfo.colors[i] / (data.colorInfo.maxColor + 1)) * 40 + 30}%)`;
}

const AllShapes = React.memo(({data}: {data: ReturnType<typeof getNewPatternData>}) => {
    return data.shapes.map((shape, i) => (
        <path d={shapeD(shape)} key={i} fill={shapeColor(data, i)} stroke="none" />
    ));
});

const AllGuides = React.memo(
    ({
        guides,
        hover,
        toggle,
        setHover,
    }: {
        guides: IGuide[];
        hover: number | null;
        setHover?: (i: number | null) => void;
        toggle?: (i: number) => void;
    }) => {
        return guides.map((guide, i) => (
            <RenderGuide
                guide={guide}
                color={guide.selected != null ? 'magenta' : 'white'}
                toggle={toggle}
                hover={hover === i}
                i={i}
                setHover={setHover}
                key={i}
            />
        ));
    },
);
