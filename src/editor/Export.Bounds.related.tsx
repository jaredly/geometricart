import {sortedVisibleInsetPaths} from '../rendering/sortedVisibleInsetPaths';
import {State} from '../types';
import {PendingBounds, newPendingBounds, addCoordToBounds} from './Bounds';
import {getClips} from '../rendering/pkInsetPaths';

export type Bounds = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export const findBoundingRect = (state: State): Bounds | null => {
    const clip = getClips(state);

    let bounds: PendingBounds = newPendingBounds();
    // NOTE: This won't totally cover arcs, but that's just too bad folks.
    sortedVisibleInsetPaths(state.paths, state.pathGroups, {next: (_, __) => 0}, clip).forEach(
        (path) => {
            let offset = path.style.lines[0]?.width;
            if (offset != null) {
                offset = offset / 2 / 100;
            }
            addCoordToBounds(bounds, path.origin, offset);
            // TODO: Get proper bounding box for arc segments.
            path.segments.forEach((t) => addCoordToBounds(bounds, t.to, offset));
        },
    );
    if (bounds.x0 == null || bounds.y0 == null) {
        return null;
    }
    return {x1: bounds.x0!, y1: bounds.y0!, x2: bounds.x1!, y2: bounds.y1!};
};