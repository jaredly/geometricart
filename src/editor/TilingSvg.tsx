
import {useMemo} from 'react';
import {translationMatrix} from '../rendering/getMirrorTransforms';
import {transformBarePath} from '../rendering/points';
import {BarePath, Coord} from '../types';
import {segmentsBounds} from './Bounds';
import {calcPathD, calcSegmentsD} from './calcPathD';
import {handleNegZero} from './handleTiling';

export function TilingSvg({
    bounds,
    lines,
    shapes,
    size = 300,
}: {
    shapes: BarePath[];
    bounds: Coord[];
    lines: [Coord, Coord][];
    size?: number;
}) {
    const normShapes = useMemo(() => {
        const margin = 0.1;
        let left = -2.5;
        let y = 0;
        let rh = 0;
        return shapes.map((shape) => {
            const bounds = segmentsBounds(shape.segments);
            if (left + (bounds.x1 - bounds.x0) > 2.5) {
                left = -2.5;
                y += rh + 0.1;
                rh = 0;
            }
            const norm = transformBarePath(shape, [
                translationMatrix({
                    x: -bounds.x0 + left,
                    y: -bounds.y0 + y,
                }),
            ]);
            left += bounds.x1 - bounds.x0 + margin;
            rh = Math.max(rh, bounds.y1 - bounds.y0);
            return norm;
        });
    }, [shapes]);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{background: 'black', width: size, height: size}}
            viewBox="-2.5 -2.5 5 5"
        >
            {' '}
            {shapes.map((shape, i) => (
                <path key={i} d={calcPathD(shape, 1)} fill="green" />
            ))}
            <path
                d={`${bounds
                    .map(
                        ({x, y}, i) =>
                            `${i === 0 ? 'M' : 'L'}${handleNegZero(x)} ${handleNegZero(y)}`,
                    )
                    .join(' ')}Z`}
                fill="rgb(50,50,50)"
                opacity={0.5}
                stroke="none"
            />
            {lines.map(([p1, p2], i) => {
                return (
                    <line
                        key={i}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        x1={p1.x.toFixed(2)}
                        x2={p2.x.toFixed(2)}
                        y1={p1.y.toFixed(2)}
                        y2={p2.y.toFixed(2)}
                        stroke="yellow"
                        strokeWidth="0.02"
                    />
                );
            })}{' '}
            {normShapes.map((shape, i) => (
                <path
                    key={i}
                    d={calcSegmentsD(shape.segments, shape.origin, shape.open, 1)}
                    fill="red"
                />
            ))}
        </svg>
    );
}
