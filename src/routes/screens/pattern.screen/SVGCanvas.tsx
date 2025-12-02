import {useEffect, useMemo, useState} from 'react';
import {Coord, shapeKey} from '../../../types';
import {pk} from '../../pk';
import {shapeD} from '../../shapeD';
import {colorToString} from './colors';
import {RenderItem} from './evaluate';
import {Box, Color, ConcreteShadow, shadowKey} from './export-types';
import {renderItems} from './recordVideo';
import {percentToWorld, worldToPercent, svgCoord} from './useSVGZoom';
import {coordKey} from '../../../rendering/coordKey';
import {useEditState} from './editState';
import {coordsEqual} from '../../../rendering/pathsAreIdentical';

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
    innerRef,
    setMouse,
    byKey,
    mouse,
    bg,
}: {
    mouse: Coord | null;
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

    // editContext = useEditContext()
    // pending = editContext.use()
    // editContext.latest().pending
    // editContext.update()
    const editContext = useEditState();

    const pending = editContext.use((s) => s.pending);
    const points = useMemo(() => {
        if (!pending) return [];
        const pts: Record<string, Coord> = {};
        items.forEach((item) => {
            item.shapes.forEach((shape) => {
                shape.forEach((pt) => {
                    const k = coordKey(pt);
                    pts[k] = pt;
                });
            });
        });
        return Object.values(pts);
    }, [items, pending]);

    // const update = editContext.useUpdate();
    // const get = editContext.useGet();

    useEffect(() => {
        if (!pending) return;
        const fn = (evt: KeyboardEvent) => {
            if (evt.key === 'Enter') {
                pending.onDone(pending.points, true);
                editContext.update.pending.replace(null);
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [pending]);

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
                        <filter key={key} id={key}>
                            <feDropShadow
                                dx={shadow.offset?.x ?? 0}
                                dy={shadow.offset?.y ?? 0}
                                stdDeviation={((shadow.blur?.x ?? 0) + (shadow.blur?.y ?? 0)) / 2}
                                flood-color={colorToString(shadow.color ?? [0, 0, 0])}
                            />
                        </filter>
                    ))}
                </defs>
            ) : null}
            {items.map(({key, shapes, pk, color, strokeWidth, zIndex, shadow, ...item}) =>
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
                        stroke={strokeWidth ? colorToString(shadow?.color ?? color) : undefined}
                        strokeWidth={strokeWidth}
                        filter={shadow ? `url(#${shadowKey(shadow)})` : undefined}
                        d={shapeD(shape)}
                        key={`${key}-${m}`}
                        onClick={() => setFocus(focus === key ? null : key)}
                        data-z={zIndex}
                    />
                )),
            )}
            {points.map((pt, i) => (
                <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={0.03}
                    fill="white"
                    onClick={() => {
                        const pending = editContext.latest().pending;
                        if (!pending) return;
                        if (pending.points.length && coordsEqual(pending.points[0], pt)) {
                            pending.onDone(pending.points, false);
                            editContext.update.pending.replace(null);
                        } else {
                            editContext.update.pending.points.push(pt);
                        }
                    }}
                    cursor={'pointer'}
                />
            ))}
            {pending && pending.points.length > (mouse ? 0 : 1) && (
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
        </svg>
        // {focus ? <div>{JSON.stringify(byKey[focus])}</div> : null}
        // </div>
    );
};
