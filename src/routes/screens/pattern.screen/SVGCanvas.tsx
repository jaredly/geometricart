import {useEffect, useMemo, useState} from 'react';
import {BarePath, Coord, shapeKey} from '../../../types';
import {Path, pk} from '../../pk';
import {shapeD} from '../../shapeD';
import {colorToString} from './colors';
import {RenderItem, RenderShadow} from './evaluate';
import {Box, Color, ConcreteShadow, shadowKey, State} from './export-types';
import {renderItems} from './renderItems';
import {percentToWorld, worldToPercent, svgCoord} from './useSVGZoom';
import {coordKey} from '../../../rendering/coordKey';
import {useEditState, usePendingState} from './editState';
import {coordsEqual} from '../../../rendering/pathsAreIdentical';
import {calcPathD} from '../../../editor/calcPathD';
import {transformBarePath} from '../../../rendering/points';
import {translationMatrix} from '../../../rendering/getMirrorTransforms';
import {edgesByEndpoint, unique} from '../../shapesFromSegments';
import {coordPairKey, sortCoordPair} from './adjustShapes';
import {pathsFromSegments} from '../../pathsFromSegments';
import {outerBoundary} from '../../outerBoundary';
import {followPath} from '../../weaveIntersections';
import {usePromise} from './usePromise';

export const Canvas = ({
    items,
    size,
    setMouse,
    box,
    innerRef,
    // byKey,
    bg,
    t,
}: {
    items: RenderItem[];
    bg: Color;
    state: State;
    mouse: Coord | null;
    size: number;
    box: Box;
    innerRef: React.RefObject<SVGElement | HTMLElement | null>;
    setMouse: (m: Coord | null) => void;
    byKey: Record<string, string[]>;
    t: number;
}) => {
    // const font = usePromise(() => fetch('/assets/Roboto-Regular.ttf').then((r) => r.arrayBuffer()));
    useEffect(() => {
        const surface = pk.MakeWebGLCanvasSurface(innerRef.current! as HTMLCanvasElement)!;
        renderItems(surface, box, items, bg);
    }, [box, items, innerRef, bg]);

    return (
        <canvas
            ref={innerRef as React.RefObject<HTMLCanvasElement>}
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
    box,
    state,
    innerRef,
    setMouse,
    keyPoints,
    // byKey,
    mouse,
    bg,
}: {
    state: State;
    mouse: Coord | null;
    keyPoints: [Coord, Coord][];
    bg: Color;
    items: RenderItem[];
    size: number;
    box: Box;
    innerRef: React.RefObject<SVGElement | HTMLElement | null>;
    setMouse: (m: Coord | null) => void;
    byKey: Record<string, string[]>;
}) => {
    const [focus, setFocus] = useState(null as null | string);

    const points = useMemo(() => unique(keyPoints.flat(), coordKey), [keyPoints]);
    const segs = useMemo(() => unique(keyPoints.map(sortCoordPair), coordPairKey), [keyPoints]);

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

    return (
        // <div>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(7)} ${box.y.toFixed(7)} ${box.width.toFixed(7)} ${box.height.toFixed(7)}`}
            ref={innerRef as React.RefObject<SVGSVGElement>}
            style={{background: colorToString(bg), width: size, height: size}}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => setMouse(svgCoord(evt))}
        >
            {svgItems}
            {rpoints.map(({key, coord, color, opacity}) => (
                <circle
                    r={lw / 10}
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
                points.map((pt, i) => (
                    <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={0.03}
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
                                        pending.onDone(shape, false);
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
            {pending?.type === 'shape' && pending.points.length > (mouse ? 0 : 1) && (
                <>
                    <path
                        d={shapeD(pending.points.concat(mouse ? [mouse] : []), false, 5)}
                        stroke="#000"
                        strokeWidth={0.05}
                        pointerEvents={'none'}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d={shapeD(pending.points.concat(mouse ? [mouse] : []), false, 5)}
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

export function generateSvgItems(
    paths: (RenderItem & {type: 'path'})[],
    focus: string | null,
    lw: number,
) {
    const shadows: Record<string, ConcreteShadow> = {};
    let hasShadows = false;
    paths.map((item) => {
        if (item.shadow) {
            hasShadows = true;
            const key = shadowKey(item.shadow);
            shadows[key] = item.shadow;
        }
    });

    return [
        hasShadows ? (
            <defs>
                {Object.entries(shadows).map(([key, shadow]) => (
                    <filter key={key} id={key} x="-50%" width="200%" y="-50%" height="200%">
                        <feDropShadow
                            dx={shadow.offset?.x ?? 0}
                            dy={shadow.offset?.y ?? 0}
                            stdDeviation={((shadow.blur?.x ?? 0) + (shadow.blur?.y ?? 0)) / 2}
                            floodColor={colorToString(shadow.color ?? [0, 0, 0])}
                        />
                    </filter>
                ))}
            </defs>
        ) : null,
        paths.map(
            ({
                key,
                shapes,
                pk,
                color,
                strokeWidth,
                zIndex,
                shadow,
                sharp,
                adjustForZoom,
                ...item
            }) =>
                shapes.map((shape, m) => (
                    <path
                        {...item}
                        fill={
                            focus === key
                                ? 'red'
                                : strokeWidth
                                  ? 'none'
                                  : colorToString(shadow?.color ?? color)
                        }
                        strokeLinejoin={sharp ? 'miter' : 'round'}
                        strokeLinecap={sharp ? 'butt' : 'round'}
                        stroke={strokeWidth ? colorToString(shadow?.color ?? color) : undefined}
                        strokeWidth={strokeWidth && adjustForZoom ? strokeWidth * lw : strokeWidth}
                        filter={shadow ? `url(#${shadowKey(shadow)})` : undefined}
                        d={calcPathD(shape, 1, 5)}
                        key={`${key}-${m}`}
                        cursor={item.onClick ? 'pointer' : undefined}
                        onClick={item.onClick} // ?? (() => setFocus(focus === key ? null : key))}
                        data-z={zIndex}
                    />
                )),
        ),
    ];
}
