/**
 * - congruent/parallel line segments
 * - measure/compare distances
 * - measure/compare angles
 * - congruent distances (excluding line segments)
 * - congruent angles
 */

import {SetStateAction, useCallback, useMemo, useState} from 'react';
import {Coord, Tiling} from '../../../types';
import {
    canonicalShape,
    getNewPatternData,
    getPatternData,
    shapeBoundsKey,
} from '../../getPatternData';
import {findCommonFractions, humanReadableFraction, showFract} from '../../findCommonFractions';
import {humanReadableRatio} from '../../humanReadableRatio';
import {shapeD} from '../../shapeD';
import {normalizeCanonShape, Shape} from '../../getUniqueShapes';
import {coordKey} from '../../../rendering/coordKey';
import {
    angleTo,
    applyMatrices,
    dist,
    Matrix,
    rotationMatrix,
    translationMatrix,
} from '../../../rendering/getMirrorTransforms';
import {mulPos} from '../../../animation/mulPos';
import {closeEnough, closeEnoughAngle} from '../../../rendering/epsilonToZero';
import {SegLink, unique} from '../../shapesFromSegments';
import {BlurInt} from '../../../editor/Forms';
import {RoundPlus} from '../../../icons/Icon';
import {filterNull} from './filterNull';
import {angleBetween} from '../../../rendering/isAngleBetween';
import {IGuide, AddMark} from './IGuide';
import {ShowLabel} from './ShowLabel';

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
    const [psize, setPsize] = useState(2);
    const data = useMemo(() => getNewPatternData(tiling, psize), [tiling, psize]);

    // const canons = useMemo(() => {
    //     const byKey: Record<string, Shape> = {};
    //     const sid = data.shapes.map((shape) => {
    //         const cs = canonicalShape(shape);
    //         if (!byKey[cs.key]) {
    //             byKey[cs.key] = normalizeCanonShape({...cs, percentage: 1});
    //         }
    //         return {canon: cs.key, cs, key: findRotated(shape)};
    //     });
    //     return {sid, byKey};
    // }, [data.shapes]);
    // const segData = useMemo(
    //     () =>
    //         data.allSegments.map(([a, b]) => ({
    //             len: dist(a, b),
    //             rot: angleTo(a, b),
    //         })),
    //     [data.allSegments],
    // );
    // const [selection, setSelection] = useState(null as null | Selection);

    const [guides, setGuides] = useState([] as IGuide[]);

    const [pending, setPending] = useState(null as null | {type: IGuide['type']; points: Coord[]});
    const [mouse, setMouse] = useState(null as null | Coord);

    const allPoints = useMemo(
        () => unique(data.allSegments.flat().concat(data.bounds), coordKey),
        [data.allSegments, data.bounds],
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

    const boxSize = 6;
    // const boxSize = 10;
    // const boxSize = 3;

    return (
        <div className="flex">
            <div className="relative">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox={`${-boxSize / 2} ${-boxSize / 2} ${boxSize} ${boxSize}`}
                    style={size ? {background: 'black', width: size, height: size} : undefined}
                    onMouseLeave={() => setMouse(null)}
                    onMouseMove={(evt) => setMouse(svgCoord(evt))}
                >
                    {data.shapes.map((shape, i) => (
                        <path d={shapeD(shape)} key={i} fill={shapeColor(data, i)} stroke="none" />
                    ))}
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
                    {guides.map((guide, i) => (
                        <RenderGuide
                            guide={guide}
                            color={guide.selected != null ? 'magenta' : 'white'}
                            hover={hover === i}
                            key={i}
                        />
                    ))}
                    {pendingGuide ? (
                        <RenderGuide hover={true} guide={pendingGuide} color="gold" />
                    ) : null}
                </svg>
                {labels.map((label) => {
                    return <ShowLabel label={label} boxSize={boxSize} size={size} hover={hover} />;
                })}
            </div>
            <div className="bg-base-300 p-4 flex-1 flex flex-col">
                <label>
                    Pattern Size
                    <input
                        value={psize}
                        type="number"
                        min="1"
                        max="4"
                        className="input w-12 mx-4"
                        onChange={(evt) => {
                            const num = +evt.target.value;
                            setPsize(Number.isFinite(num) ? Math.min(Math.max(1, num), 4) : 1);
                        }}
                    />
                </label>
                <div className="bg-base-200 rounded-md mt-4">
                    <h2 className="text-xl flex justify-between p-0">
                        <div className="p-3">Marks</div>
                        <AddMark pending={pending} setPending={setPending} />
                    </h2>
                    <div>
                        <table className="table">
                            <tbody>
                                {guides.map((guide, i) => (
                                    <tr
                                        key={i}
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

const getLabels = (guides: IGuide[]) => {
    // guides = guides.filter((g) => g.selected != null).sort((a, b) => a.selected! - b.selected!);
    // console.log('labesl', guides);
    const res: {
        i: number;
        j: number;
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
                    i,
                    j,
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
    if (one.type === 'line' && two.type === 'line') {
        const d1 = dist(one.p1, one.p2);
        const d2 = dist(two.p1, two.p2);
        const rat = humanReadableRatio(d1, d2);
        console.log('lengths', d1, d2, d1 / d2, rat);
        let angle = angleBetween(angleTo(one.p1, one.p2), angleTo(two.p1, two.p2), true);
        if (angle > Math.PI) {
            angle = Math.PI * 2 - angle;
        }
        if (angle > Math.PI / 2) {
            angle = Math.PI - angle;
        }
        return {angle: showAngle(angle), lengths: rat};
    }
    if (one.type === 'circle' && two.type === 'circle') {
        const d1 = dist(one.p1, one.p2);
        const d2 = dist(two.p1, two.p2);
        return {lengths: humanReadableRatio(d1, d2)};
    }
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

const RenderGuide = ({guide, color, hover}: {hover: boolean; guide: IGuide; color?: string}) =>
    guide.type === 'line' ? (
        <line
            fill="none"
            stroke={color ?? 'white'}
            strokeWidth={hover ? 0.02 : 0.005}
            pointerEvents={'none'}
            x1={guide.p1.x}
            y1={guide.p1.y}
            x2={guide.p2.x}
            y2={guide.p2.y}
        />
    ) : (
        <circle
            cx={guide.p1.x}
            cy={guide.p1.y}
            r={dist(guide.p1, guide.p2)}
            fill="none"
            stroke={color ?? 'white'}
            strokeWidth={hover ? 0.02 : 0.005}
            pointerEvents={'none'}
        />
    );

function svgCoord(evt: React.MouseEvent<SVGSVGElement>) {
    const box = evt.currentTarget.getBoundingClientRect();
    const x0 = (evt.clientX - box.left) / box.width;
    const y0 = (evt.clientY - box.top) / box.height;
    const vb = evt.currentTarget.viewBox.animVal;
    const x = vb.width * x0 + vb.x;
    const y = vb.height * y0 + vb.y;
    return {x, y};
}

function shapeColor(data: ReturnType<typeof getNewPatternData>, i: number): string | undefined {
    return data.colorInfo.colors[i] === -1
        ? '#444'
        : `hsl(100 0% ${(data.colorInfo.colors[i] / (data.colorInfo.maxColor + 1)) * 40 + 30}%)`;
}
