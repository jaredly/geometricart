import {PathKit, Path as PKPath} from 'pathkit-wasm';
import * as React from 'react';
import {calcSegmentsD} from '../editor/calcPathD';
import {PK} from '../editor/pk';
import {cmdsToSegments} from '../gcode/cmdsToSegments';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {ensureClockwise} from '../rendering/pathToPoints';
import {Action} from '../state/Action';
import {Segment, Coord, State, Path} from '../types';

export const pkPath = (PK: PathKit, segments: Segment[], origin?: Coord, open?: boolean) => {
    const d = calcSegmentsD(segments, origin ?? segments[segments.length - 1].to, open, 1);
    return PK.FromSVGString(d);
};

export const pkInset = (PK: PathKit, path: PKPath, inset: number) => {
    const line = path.copy();
    line.stroke({
        width: inset < 0 ? -inset : inset,
        join: PK.StrokeJoin.MITER,
        cap: PK.StrokeCap.SQUARE,
    });
    path.op(line, inset < 0 ? PK.PathOp.UNION : PK.PathOp.DIFFERENCE);
    line.delete();
    return path;
};

const pkClipPath = (
    PK: PathKit,
    pkp: PKPath,
    pkClip: PKPath,
    outside = false,
): {segments: Segment[]; origin: Coord}[] => {
    pkp.op(pkClip, outside ? PK.PathOp.DIFFERENCE : PK.PathOp.INTERSECT);

    return pkPathToSegments(PK, pkp);
};

export const pkPathToSegments = (PK: PathKit, pkp: PKPath) => {
    const clipped = cmdsToSegments(pkp.toCmds(), PK);

    clipped.forEach((region) => {
        const {segments, origin, open} = region;
        if (!open) {
            if (!coordsEqual(segments[segments.length - 1].to, origin)) {
                console.error('NO BADS clipped idk', segments, origin);
                console.log(pkp.toCmds());
            }
            const segs = ensureClockwise(segments);
            region.segments = segs;
            region.origin = segs[segs.length - 1].to;
        }
    });

    return clipped;
};

export const pkClipPaths = (
    state: State,
    clip: Segment[],
    inset: number,
    pathIds: string[],
    dispatch: React.Dispatch<Action>,
    outside = false,
) => {
    const pkClip = pkPath(PK, clip);
    if (inset != 0) {
        pkInset(PK, pkClip, inset / 100);
    }

    const paths: {[key: string]: Path | null} = {};
    let nextId = state.nextId;

    pathIds.forEach((id) => {
        const path = state.paths[id];
        const pkp = pkPath(PK, path.segments, path.origin, path.open);

        const clipped = pkClipPath(PK, pkp, pkClip, outside);

        console.log(`Path ${id} clip`);
        console.log('Started as', path.segments);
        console.log('Became', clipped);

        paths[id] = {...path, ...clipped[0]};
        for (let i = 1; i < clipped.length; i++) {
            const pt = clipped[i];
            paths[nextId] = {...path, ...pt};
            nextId += 1;
        }
    });

    dispatch({
        type: 'selection:set',
        selection: null,
    });
    dispatch({
        type: 'path:update:many',
        changed: paths,
        nextId,
    });
};
