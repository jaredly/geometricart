import {useEffect, useState} from 'react';
import {Coord, shapeKey} from '../../../types';
import {pk} from '../../pk';
import {shapeD} from '../../shapeD';
import {colorToString} from './colors';
import {RenderItem} from './evaluate';
import {Box, Color, ConcreteShadow, shadowKey} from './export-types';
import {renderItems} from './recordVideo';
import {percentToWorld, worldToPercent, svgCoord} from './useSVGZoom';
import {coordKey} from '../../../rendering/coordKey';

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
    bg,
}: {
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
        </svg>
        // {focus ? <div>{JSON.stringify(byKey[focus])}</div> : null}
        // </div>
    );
};
