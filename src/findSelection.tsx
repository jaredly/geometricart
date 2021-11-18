import { angleTo, dist } from './getMirrorTransforms';
import { lineLine, lineToSlope, Primitive } from './intersect';
import { Coord, Id, Path, PathGroup } from './types';

export const findSelection = (
    paths: { [key: string]: Path },
    groups: { [key: string]: PathGroup },
    rect: Rect,
): Array<Id> => {
    return Object.keys(paths).filter((k) => {
        const path = paths[k];
        if (path.hidden) {
            return false;
        }
        if (path.group && groups[path.group].hide) {
            return false;
        }
        return intersectsRect(path, rect);
    });
};
type Rect = { x1: number; y1: number; x2: number; y2: number };

export const intersectsRect = (path: Path, rect: Rect) => {
    // Options include:
    // - at least one point on the path is inside the rect
    // or
    // - at least one point of the rect is inside the path
    // or
    // - at least one edge from one crosses one edge from the other

    // I don't really want to do the "is a point inside this big path"
    // because that's expensive.
    // And it's only necessary if we're selecting entirely inside a path.
    // which I think is fine to skip.
    for (let seg of path.segments) {
        if (pointInRect(seg.to, rect)) {
            return true;
        }
    }

    const rectLines = [
        lineToSlope(
            { x: rect.x1, y: rect.y1 },
            { x: rect.x2, y: rect.y1 },
            true,
        ),
        lineToSlope(
            { x: rect.x1, y: rect.y1 },
            { x: rect.x1, y: rect.y2 },
            true,
        ),
        lineToSlope(
            { x: rect.x2, y: rect.y2 },
            { x: rect.x1, y: rect.y2 },
            true,
        ),
        lineToSlope(
            { x: rect.x2, y: rect.y2 },
            { x: rect.x2, y: rect.y1 },
            true,
        ),
    ];

    const pathAsPrimitives = path.segments.map((seg, i): Primitive => {
        const prev = i === 0 ? path.origin : path.segments[i - 1].to;
        if (seg.type === 'Line') {
            return lineToSlope(prev, seg.to, true);
        }
        // TODO: need to define the limit!
        const t0 = angleTo(seg.center, prev);
        const t1 = angleTo(seg.center, seg.to);
        return {
            type: 'circle',
            center: seg.center,
            radius: dist(seg.center, seg.to),
            limit: seg.clockwise ? [t0, t1] : [t1, t0],
        };
    });

    for (let line of rectLines) {
        for (let seg of pathAsPrimitives) {
            if (seg.type === 'line') {
                if (lineLine(line, seg) != null) {
                    return true;
                }
            } else {
                // Not supported yet!!
                continue;
            }
        }
    }
    return false;
};

export const pointInRect = (pos: Coord, rect: Rect) =>
    rect.x1 <= pos.x &&
    pos.x <= rect.x2 &&
    rect.y1 <= pos.y &&
    pos.y <= rect.y2;
