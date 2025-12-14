import {useEffect, useMemo, useState} from 'react';
import {Coord, shapeKey} from '../../../types';
import {pk} from '../../pk';
import {shapeD} from '../../shapeD';
import {colorToString} from './colors';
import {RenderItem} from './evaluate';
import {Box, Color, ConcreteShadow, shadowKey, State} from './export-types';
import {renderItems} from './renderItems';
import {percentToWorld, worldToPercent, svgCoord} from './useSVGZoom';
import {coordKey} from '../../../rendering/coordKey';
import {useEditState, usePendingState} from './editState';
import {coordsEqual} from '../../../rendering/pathsAreIdentical';
import {calcPathD} from '../../../editor/calcPathD';
import {transformBarePath} from '../../../rendering/points';
import {translationMatrix} from '../../../rendering/getMirrorTransforms';
import {unique} from '../../shapesFromSegments';

export const Canvas = ({
    items,
    size,
    setMouse,
    box,
    innerRef,
    byKey,
    bg,
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
}) => {
    useEffect(() => {
        const surface = pk.MakeWebGLCanvasSurface(innerRef.current! as HTMLCanvasElement)!;
        renderItems(surface, box, items, bg);
    }, [box, items, innerRef]);

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
    byKey,
    mouse,
    bg,
}: {
    state: State;
    mouse: Coord | null;
    keyPoints: Coord[];
    bg: Color;
    items: RenderItem[];
    size: number;
    box: Box;
    innerRef: React.RefObject<SVGElement | HTMLElement | null>;
    setMouse: (m: Coord | null) => void;
    byKey: Record<string, string[]>;
}) => {
    const shadows: Record<string, ConcreteShadow> = {};
    let hasShadows = false;
    items.map((item) => {
        if (item.shadow) {
            hasShadows = true;
            const key = shadowKey(item.shadow);
            shadows[key] = item.shadow;
        }
    });
    const [focus, setFocus] = useState(null as null | string);

    const points = useMemo(() => unique(keyPoints, coordKey), [keyPoints]);

    // editContext = useEditContext()
    // pending = editContext.use()
    // editContext.latest().pending
    // editContext.update()
    const editContext = usePendingState();

    const pending = editContext.use((s) => s.pending);
    // const points = useMemo(() => {
    //     if (!pending) return [];
    //     const pts: Record<string, Coord> = {};
    //     items.forEach((item) => {
    //         item.shapes.forEach((shape) => {
    //             shape.segments.forEach((seg) => {
    //                 const k = coordKey(seg.to);
    //                 pts[k] = seg.to;
    //             });
    //             const k = coordKey(shape.origin);
    //             pts[k] = shape.origin;
    //         });
    //     });
    //     return Object.values(pts);
    // }, [items, pending]);

    // const update = editContext.useUpdate();
    // const get = editContext.useGet();

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

    return (
        // <div>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(4)} ${box.y.toFixed(4)} ${box.width.toFixed(4)} ${box.height.toFixed(4)}`}
            ref={innerRef as React.RefObject<SVGSVGElement>}
            style={{background: colorToString(bg), width: size, height: size}}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => setMouse(svgCoord(evt))}
        >
            {hasShadows ? (
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
            ) : null}
            {items.map(({key, shapes, pk, color, strokeWidth, zIndex, shadow, sharp, ...item}) =>
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
                        strokeWidth={strokeWidth}
                        filter={shadow ? `url(#${shadowKey(shadow)})` : undefined}
                        d={calcPathD(shape)}
                        key={`${key}-${m}`}
                        cursor={item.onClick ? 'pointer' : undefined}
                        onClick={item.onClick} // ?? (() => setFocus(focus === key ? null : key))}
                        data-z={zIndex}
                    />
                )),
            )}
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
                                pending.onDone(pending.points, false);
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
                        d={shapeD(pending.points.concat(mouse ? [mouse] : []), false)}
                        stroke="#000"
                        strokeWidth={0.05}
                        pointerEvents={'none'}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d={shapeD(pending.points.concat(mouse ? [mouse] : []), false)}
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
