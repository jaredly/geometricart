import {newPendingBounds, addCoordToBounds} from '../editor/Bounds';
import {translationMatrix, scaleMatrix, applyMatrices} from '../rendering/getMirrorTransforms';
import {Coord} from '../types';

export const normShape = (shape: Coord[]) => {
    const bounds = newPendingBounds();
    shape.forEach((coord) => addCoordToBounds(bounds, coord));
    const w = bounds.x1! - bounds.x0!;
    const h = bounds.y1! - bounds.y0!;
    const dim = Math.max(w, h);
    const tx = [
        translationMatrix({x: -w / 2 - bounds.x0!, y: -h / 2 - bounds.y0!}),
        scaleMatrix(1.5 / dim, 1.5 / dim),
    ];
    return shape.map((coord) => applyMatrices(coord, tx));
};
