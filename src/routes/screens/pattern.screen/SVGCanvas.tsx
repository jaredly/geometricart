import {useEffect, useMemo, useRef, useState} from 'react';
import {BarePath, Coord, shapeKey} from '../../../types';
import {Path, pk} from '../../pk';
import {shapeD} from '../../shapeD';
import {colorToString} from './utils/colors';
import {RenderItem, RenderShadow} from './eval/evaluate';
import {Box, Color} from './export-types';
import {State} from './types/state-type';
import {renderItems} from './render/renderItems';
import {percentToWorld, worldToPercent, svgCoord, ZoomProps} from './hooks/useSVGZoom';
import {coordKey} from '../../../rendering/coordKey';
import {useEditState, usePendingState} from './utils/editState';
import {coordsEqual} from '../../../rendering/pathsAreIdentical';
import {calcPathD} from '../../../editor/calcPathD';
import {transformBarePath} from '../../../rendering/points';
import {translationMatrix} from '../../../rendering/getMirrorTransforms';
import {edgesByEndpoint, unique} from '../../shapesFromSegments';
import {coordPairKey, sortCoordPair} from './utils/adjustShapes';
import {pathsFromSegments} from '../../pathsFromSegments';
import {outerBoundary} from '../../outerBoundary';
import {followPath} from '../../followPath';
import {barePathFromCoords} from './utils/resolveMods';
import {generateSvgItems} from './generateSvgItems';
import {GrDirectContext, Surface} from 'canvaskit-wasm';
import {getConstrainedSurface} from './render/recordVideo';

export const Canvas = ({
    items,
    size,
    setMouse,
    zoomProps: {innerRef, box},
    bg,
    t,
}: {
    items: RenderItem[];
    bg: Color | null;
    state: State;
    mouse: Coord | null;
    size: number;
    zoomProps: ZoomProps;
    setMouse: (m: Coord | null) => void;
    byKey: Record<string, string[]>;
    t: number;
}) => {
    const sref = useRef<null | {surface: Surface | null; grc: GrDirectContext}>(null);
    // const font = usePromise(() => fetch('/assets/Roboto-Regular.ttf').then((r) => r.arrayBuffer()));
    useEffect(() => {
        if (!sref.current) return;
        const {surface} = sref.current;
        // const {surface, grc} = getConstrainedSurface(innerRef.current.node! as HTMLCanvasElement);
        // no need for AA when previewing
        renderItems(surface!, box, items, bg, false);
        // surface!.delete();
        // grc.releaseResourcesAndAbandonContext();
    }, [box, items, bg]);

    useEffect(() => {
        return () => sref.current?.grc.releaseResourcesAndAbandonContext();
    }, []);

    return (
        <canvas
            ref={(node) => {
                if (node && innerRef.current.node !== node) {
                    sref.current = getConstrainedSurface(node);
                    innerRef.current.node = node;
                    innerRef.current.tick();
                }
            }}
            style={{background: 'black', width: size, height: size}}
            width={size * 2}
            height={size * 2}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => {
                const cbox = evt.currentTarget.getBoundingClientRect();
                setMouse(
                    percentToWorld(worldToPercent({x: evt.clientX, y: evt.clientY}, cbox), box),
                );
            }}
        />
    );
};

export const SVGCanvas = ({
    items,
    size,
    zoomProps: {box, innerRef},
    state,
    setMouse,
    keyPoints,
    // byKey,
    mouse,
    bg,
}: {
    state: State;
    mouse: Coord | null;
    keyPoints: ([Coord, Coord] | Coord)[];
    bg: Color | null;
    items: RenderItem[];
    size: number;
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

    const pending = editContext.use((s) => s.pending);

    useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.key === 'Enter') {
                if (pending?.type !== 'shape') return;
                editContext.update.pending.replace(null);
                pending.onDone(pending.points, true);
            }
            if (evt.key === 'Escape') {
                editContext.update.pending.replace(null);
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
        pending?.type === 'shape' && pending.points.length > (mouse ? 0 : 1)
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
            style={{background: bg ? colorToString(bg) : undefined, width: size, height: size}}
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
                            if (pending.type !== 'shape') return;
                            if (pending.points.length && coordsEqual(pending.points[0], pt)) {
                                editContext.update.pending.replace(null);

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
                                editContext.update.pending.variant('shape').points.push(pt);
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
