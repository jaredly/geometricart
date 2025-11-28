import {useEffect} from 'react';
import {Coord} from '../../../types';
import {pk} from '../../pk';
import {shapeD} from '../../shapeD';
import {colorToString} from './colors';
import {RenderItem} from './evaluate';
import {Box} from './export-types';
import {renderItems} from './recordVideo';
import {percentToWorld, worldToPercent, svgCoord} from './useSVGZoom';

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
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(4)} ${box.y.toFixed(4)} ${box.width.toFixed(4)} ${box.height.toFixed(4)}`}
            ref={innerRef as React.RefObject<SVGSVGElement>}
            style={{background: 'black', width: size, height: size}}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => setMouse(svgCoord(evt))}
        >
            {items.map(({key, shapes, pk, fill, stroke, zIndex, ...item}) =>
                shapes.map((shape, m) => (
                    <path
                        {...item}
                        fill={stroke ? 'none' : colorToString(fill!)}
                        stroke={stroke ? colorToString(stroke) : undefined}
                        d={shapeD(shape)}
                        key={`${key}-${m}`}
                    />
                )),
            )}
        </svg>
    );
};
