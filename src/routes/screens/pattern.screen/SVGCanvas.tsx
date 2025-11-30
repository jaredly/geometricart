import {useEffect} from 'react';
import {Coord, shapeKey} from '../../../types';
import {pk} from '../../pk';
import {shapeD} from '../../shapeD';
import {colorToString} from './colors';
import {RenderItem} from './evaluate';
import {Box, ConcreteShadow, shadowKey} from './export-types';
import {renderItems} from './recordVideo';
import {percentToWorld, worldToPercent, svgCoord} from './useSVGZoom';
import {coordKey} from '../../../rendering/coordKey';

export const Canvas = ({
    items,
    size,
    setMouse,
    box,
    innerRef,
}: {
    items: RenderItem[];
    size: number;
    box: Box;
    innerRef: React.RefObject<SVGElement | HTMLElement | null>;
    setMouse: (m: Coord | null) => void;
}) => {
    useEffect(() => {
        const surface = pk.MakeWebGLCanvasSurface(innerRef.current! as HTMLCanvasElement)!;
        renderItems(surface, box, items);
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
}: {
    items: RenderItem[];
    size: number;
    box: Box;
    innerRef: React.RefObject<SVGElement | HTMLElement | null>;
    setMouse: (m: Coord | null) => void;
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
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(4)} ${box.y.toFixed(4)} ${box.width.toFixed(4)} ${box.height.toFixed(4)}`}
            ref={innerRef as React.RefObject<SVGSVGElement>}
            style={{background: 'black', width: size, height: size}}
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
                        fill={strokeWidth ? 'none' : colorToString(shadow?.color ?? color)}
                        stroke={strokeWidth ? colorToString(shadow?.color ?? color) : undefined}
                        strokeWidth={strokeWidth}
                        filter={shadow ? `url(#${shadowKey(shadow)})` : undefined}
                        d={shapeD(shape)}
                        key={`${key}-${m}`}
                        data-z={zIndex}
                    />
                )),
            )}
        </svg>
    );
};
