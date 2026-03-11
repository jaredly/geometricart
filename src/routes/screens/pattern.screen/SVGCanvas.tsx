import {useEffect, useMemo, useState} from 'react';
import {calcPathD} from '../../../editor/calcPathD';
import {useValue} from '../../../json-diff/react';
import {coordKey} from '../../../rendering/coordKey';
import {translationMatrix} from '../../../rendering/getMirrorTransforms';
import {coordsEqual} from '../../../rendering/pathsAreIdentical';
import {transformBarePath} from '../../../rendering/points';
import {BarePath, Coord} from '../../../types';
import {followPath} from '../../followPath';
import {outerBoundary} from '../../outerBoundary';
import {pathsFromSegments} from '../../pathsFromSegments';
import {edgesByEndpoint, unique} from '../../shapesFromSegments';
import {RenderItem} from './eval/evaluate';
import {Box, Color} from './export-types';
import {generateSvgItems} from './generateSvgItems';
import {svgCoord, ZoomProps} from './hooks/useSVGZoom';
import {State} from './types/state-type';
import {coordPairKey, sortCoordPair} from './utils/adjustShapes';
import {colorToString} from './utils/colors';
import {usePendingState} from './utils/editState';
import {barePathFromCoords} from './utils/resolveMods';
import {Bounds, boundsForCoords} from '../../../editor/Bounds';

export const boxForBounds = (bounds: Bounds): Box => ({
    x: bounds.x0,
    y: bounds.y0,
    width: bounds.x1 - bounds.x0,
    height: bounds.y1 - bounds.y0,
});

export const asRect = (coords: Coord[], startCenter: boolean) => {
    if (startCenter) {
        const c = coords[0];
        let x0 = c.x;
        let y0 = c.y;
        let x1 = c.x;
        let y1 = c.y;
        const add = (coord: Coord) => {
            x0 = Math.min(x0, coord.x);
            y0 = Math.min(y0, coord.y);
            x1 = Math.max(x1, coord.x);
            y1 = Math.max(y1, coord.y);
        };
        for (let i = 1; i < coords.length; i++) {
            add(coords[i]);
            add({x: c.x * 2 - coords[i].x, y: c.y * 2 - coords[i].y});
        }
        return boxForBounds({x0, y0, x1, y1});
    } else {
        return boxForBounds(boundsForCoords(...coords));
    }
};

const barePathForBox = (box: Box): BarePath => ({
    origin: {x: box.x, y: box.y},
    segments: [
        {type: 'Line', to: {x: box.x, y: box.y + box.height}},
        {type: 'Line', to: {x: box.x + box.width, y: box.y + box.height}},
        {type: 'Line', to: {x: box.x + box.width, y: box.y}},
    ],
});

export const SVGCanvas = ({
    items,
    zoomProps: {box, innerRef},
    state,
    size,
    setMouse,
    keyPoints,
    // byKey,
    mouse,
    bg,
}: {
    size: Coord;
    state: State;
    mouse: Coord | null;
    keyPoints: ([Coord, Coord] | Coord)[];
    bg: Color | null;
    items: RenderItem[];
    zoomProps: ZoomProps;
    setMouse: (m: Coord | null) => void;
    byKey: Record<string, string[]>;
}) => {
    const [focus, setFocus] = useState(null as null | string);

    const points = useMemo(() => unique(keyPoints.flat(), coordKey), [keyPoints]);
    const segs = useMemo(
        () => unique(keyPoints.filter((p) => Array.isArray(p)).map(sortCoordPair), coordPairKey),
        [keyPoints],
    );

    const editContext = usePendingState();

    const pending = useValue(editContext.$.pending);

    useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.key === 'Enter') {
                if (pending?.type === 'rect') {
                    editContext.$.pending(null);
                    if (pending.points.length > 1) {
                        pending.onDone(asRect(pending.points, pending.startCenter));
                    }
                    return;
                }
                if (pending?.type !== 'shape') return;
                editContext.$.pending(null);
                pending.onDone(pending.points, true);
            }
            if (evt.key === 'Escape') {
                editContext.$.pending(null);
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [pending, editContext]);

    const lw = box.width / 10;
    const paths = items.filter((p) => p.type === 'path') as (RenderItem & {type: 'path'})[];
    const rpoints = items.filter((p) => p.type === 'point') as (RenderItem & {type: 'point'})[];

    const svgItems = generateSvgItems(paths, focus, lw);

    const pendingShape =
        pending?.type === 'rect' && pending.points.length > (mouse ? 0 : 1)
            ? barePathForBox(
                  asRect(mouse ? [...pending.points, mouse] : pending.points, pending.startCenter),
              )
            : pending?.type === 'shape' && pending.points.length > (mouse ? 0 : 1)
              ? pending.asShape
                  ? pending.asShape(mouse ? [...pending.points, mouse] : pending.points)
                  : barePathFromCoords(mouse ? [...pending.points, mouse] : pending.points)
              : null;

    return (
        // <div>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(7)} ${box.y.toFixed(7)} ${box.width.toFixed(7)} ${box.height.toFixed(7)}`}
            ref={(node) => {
                if (node && innerRef.current.node !== node) {
                    innerRef.current.node = node;
                    innerRef.current.tick();
                }
            }}
            style={{
                background: bg ? colorToString(bg) : undefined,
                width: size.x,
                height: size.y,
            }}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => setMouse(svgCoord(evt))}
        >
            {svgItems}
            {rpoints.map(({key, coord, color, opacity, size}) => (
                <circle
                    r={(lw / 10) * (size ?? 1)}
                    fill={colorToString(color ?? {r: 255, g: 0, b: 0})}
                    stroke="none"
                    pointerEvents={'none'}
                    cx={coord.x}
                    cy={coord.y}
                    key={key}
                    opacity={opacity}
                />
            ))}
            {pending &&
                pending.type !== 'select-shapes' &&
                pending.type !== 'select-shape' &&
                points.map((pt, i) => (
                    <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={lw / 20}
                        fill="white"
                        onClick={() => {
                            const pending = editContext.latest().pending;
                            if (!pending) return;
                            if (pending.type === 'dup-shape') {
                                pending.onDone(pt);
                                return;
                            }
                            if (pending.type === 'rect') {
                                editContext.$.pending.$variant('rect').points.$push(pt);
                                return;
                            }
                            if (pending.type !== 'shape') return;
                            if (pending.points.length && coordsEqual(pending.points[0], pt)) {
                                editContext.$.pending(null);

                                if (pending.points.length === 1) {
                                    const byEndPoint = edgesByEndpoint(segs);
                                    const pointNames = Object.fromEntries(
                                        points.map((p, i) => [coordKey(p), i]),
                                    );
                                    const outer = outerBoundary(segs, byEndPoint, pointNames);
                                    const paths = pathsFromSegments(segs, byEndPoint, outer);
                                    const shape = followPath(paths, segs, pt);
                                    if (shape) {
                                        pending.onDone(shape.points, !!shape.open);
                                    } else {
                                        console.log('failed to find a shape sry');
                                    }
                                } else {
                                    pending.onDone(pending.points, false);
                                }
                            } else {
                                editContext.$.pending.$variant('shape').points.$push(pt);
                            }
                        }}
                        cursor={'pointer'}
                    />
                ))}
            {pendingShape && (
                <>
                    <path
                        d={calcPathD(pendingShape, undefined, 5)}
                        stroke="#000"
                        strokeWidth={0.05}
                        pointerEvents={'none'}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d={calcPathD(pendingShape, undefined, 5)}
                        stroke="#0f7"
                        strokeWidth={0.03}
                        pointerEvents={'none'}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            )}
            {pending?.type === 'dup-shape' && mouse && (
                <path
                    d={calcPathD(
                        transformBarePath(state.shapes[pending.id], [
                            translationMatrix({
                                x: mouse.x - state.shapes[pending.id].origin.x,
                                y: mouse.y - state.shapes[pending.id].origin.y,
                            }),
                        ]),
                    )}
                    stroke="#000"
                    strokeWidth={0.05}
                    pointerEvents={'none'}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </svg>
        // {focus ? <div>{JSON.stringify(byKey[focus])}</div> : null}
        // </div>
    );
};
