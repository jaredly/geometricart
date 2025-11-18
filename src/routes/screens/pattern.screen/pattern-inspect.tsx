/**
 * - congruent/parallel line segments
 * - measure/compare distances
 * - measure/compare angles
 * - congruent distances (excluding line segments)
 * - congruent angles
 */

import {useMemo, useState} from 'react';
import {Coord, Tiling} from '../../../types';
import {
    canonicalShape,
    getNewPatternData,
    getPatternData,
    shapeBoundsKey,
} from '../../getPatternData';
import {shapeD} from '../../shapeD';
import {normalizeCanonShape, Shape} from '../../getUniqueShapes';
import {coordKey} from '../../../rendering/coordKey';
import {
    angleTo,
    applyMatrices,
    dist,
    rotationMatrix,
    translationMatrix,
} from '../../../rendering/getMirrorTransforms';
import {mulPos} from '../../../animation/mulPos';
import {closeEnough, closeEnoughAngle} from '../../../rendering/epsilonToZero';

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

export const PatternInspect = ({tiling}: {tiling: Tiling}) => {
    const size = 1000;
    const cs = 2.1;
    const data = useMemo(
        () =>
            getNewPatternData(tiling, 2, [
                {
                    rough: true,
                    segments: [
                        {type: 'Line', to: {x: cs, y: -cs}},
                        {type: 'Line', to: {x: -cs, y: -cs}},
                        {type: 'Line', to: {x: -cs, y: cs}},
                        {type: 'Line', to: {x: cs, y: cs}},
                    ],
                },
            ]),
        [tiling],
    );
    const canons = useMemo(() => {
        const byKey: Record<string, Shape> = {};
        const sid = data.shapes.map((shape) => {
            const cs = canonicalShape(shape);
            if (!byKey[cs.key]) {
                byKey[cs.key] = normalizeCanonShape({...cs, percentage: 1});
            }
            return {canon: cs.key, cs, key: findRotated(shape)};
        });
        return {sid, byKey};
    }, [data.shapes]);
    const segData = useMemo(
        () =>
            data.allSegments.map(([a, b]) => ({
                len: dist(a, b),
                rot: angleTo(a, b),
            })),
        [data.allSegments],
    );

    const color = (i: number) => {
        if (selection?.type === 'shape') {
            if (selection.i === i) {
                return {className: 'fill-amber-900'};
            }
            const ci = canons.sid[selection.i];
            if (ci.key === canons.sid[i].key) {
                return {className: 'fill-amber-700'};
            }
            if (ci.canon === canons.sid[i].canon) {
                return {className: 'fill-amber-500'};
            }
        }
        return {
            fill:
                data.colorInfo.colors[i] === -1
                    ? '#444'
                    : `hsl(100 0% ${
                          (data.colorInfo.colors[i] / (data.colorInfo.maxColor + 1)) * 40 + 30
                      }%)`,
            className: 'hover:fill-amber-300',
        };
    };

    const segColor = (i: number) => {
        if (selection?.type !== 'seg') {
            return {
                className: 'hover:stroke-amber-300',
                stroke: 'white',
            };
        }
        if (selection?.type === 'seg') {
            if (selection.i === i) {
                return {className: 'stroke-amber-900'};
            }
            const sd = segData[selection.i];
            const md = segData[i];
            if (closeEnough(sd.len, md.len)) {
                if (closeEnoughAngle(sd.rot, md.rot)) {
                    return {className: 'stroke-amber-700'};
                }
                return {className: 'stroke-amber-500'};
            }
            // const ci = canons.sid[selection.i];
            // if (ci.key === canons.sid[i].key) {
            //     return {className: 'fill-amber-700'};
            // }
            // if (ci.canon === canons.sid[i].canon) {
            //     return {className: 'fill-amber-500'};
            // }
        }
        return {stroke: 'white'};
    };

    const [selection, setSelection] = useState(null as null | Selection);

    return (
        <div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                // viewBox="-5 -5 10 10"
                viewBox="-3 -3 6 6"
                // viewBox="-1.5 -1.5 3 3"
                style={size ? {background: 'black', width: size, height: size} : undefined}
                onClick={(evt) => {
                    if (evt.currentTarget === evt.target) {
                        setSelection(null);
                    }
                }}
            >
                {data.shapes.map((shape, i) => (
                    <path
                        d={shapeD(shape)}
                        key={i}
                        {...color(i)}
                        stroke="none"
                        cursor={'pointer'}
                        onClick={() => {
                            setSelection({type: 'shape', i});
                        }}
                    />
                ))}
                <path
                    d={shapeD(data.bounds)}
                    stroke="white"
                    strokeWidth={0.02}
                    fill="none"
                    strokeDasharray={'0.02 0.05'}
                    pointerEvents={'none'}
                />
                {data.allSegments.map((line, i) => (
                    <path
                        d={shapeD(line, false)}
                        {...segColor(i)}
                        // stroke={'white'}
                        strokeWidth={data.minSegLength / 10}
                        // className="hover:stroke-amber-300"
                        strokeLinejoin="round"
                        cursor={'pointer'}
                        strokeLinecap="round"
                        fill="none"
                        key={i}
                        onClick={() => {
                            setSelection({type: 'seg', i});
                        }}
                    />
                ))}
            </svg>
            {/* {selection ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    // viewBox="-5 -5 10 10"
                    // viewBox="-3 -3 6 6"
                    viewBox="-1 -1 2 2"
                    style={{background: 'black', width: 400, height: 400}}
                >
                    <path
                        d={shapeD(canons.sid[selection.i].rotated)}
                        stroke="white"
                        strokeWidth={0.02}
                        fill="none"
                        pointerEvents={'none'}
                    />
                    {canons.sid[selection.i].rotated.map((c, i) => (
                        <circle
                            cx={c.x}
                            cy={c.y}
                            key={i}
                            fill={i === 0 ? 'red' : 'green'}
                            r={0.03}
                        />
                    ))}
                </svg>
            ) : null} */}
        </div>
    );
};
