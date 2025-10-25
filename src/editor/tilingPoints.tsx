import {Coord, Tiling, TilingShape} from '../types';
import {
    Matrix,
    angleTo,
    applyMatrices,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import {scalePos} from './scalePos';
import {tilingTransforms} from './tilingTransforms';

export const transformLines = (lines: [Coord, Coord][], mx: Matrix[]) =>
    lines.map(([p1, p2]): [Coord, Coord] => [applyMatrices(p1, mx), applyMatrices(p2, mx)]);

export const transformShape = (pts: Coord[], tx: Matrix[]) =>
    pts.map((pt) => applyMatrices(pt, tx));

export const transformLine = ([p1, p2]: [Coord, Coord], tx: Matrix[]) =>
    [applyMatrices(p1, tx), applyMatrices(p2, tx)] as [Coord, Coord];

export const applyTilingTransforms = (unique: [Coord, Coord][], mx: Matrix[][][]) => {
    return applyTilingTransformsG(unique, mx, transformLine);
};

export const applyTilingTransformsG = <T,>(
    unique: T[],
    mx: Matrix[][][],
    applyTransform: (t: T, tx: Matrix[]) => T,
) => {
    let full = unique;
    mx.forEach((set) => {
        full = full.concat(...set.map((m) => full.map((item) => applyTransform(item, m))));
    });
    return full;
};

export function eigenShapesToLines(
    unique: [Coord, Coord][],
    shape: TilingShape,
    tr: Coord,
    tpts: Coord[],
) {
    return applyTilingTransforms(unique, tilingTransforms(shape, tr, tpts));
}

export function eigenShapesToSvg(
    unique: [Coord, Coord][],
    shape: TilingShape,
    tr: Coord,
    tpts: Coord[],
) {
    let full = eigenShapesToLines(unique, shape, tr, tpts);

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" style="background:black" height="50" viewBox="-2.5 -2.5 5 5">
    <path
        d="${tpts
            .map(({x, y}, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
            .join(' ')}Z"
        fill="rgb(50,50,50)"
        stroke="none"
    />
    ${full
        .map(([p1, p2]) => {
            return `<line
            stroke-linecap='round' stroke-linejoin='round'
             x1="${p1.x}" x2="${p2.x}" y1="${p1.y}" y2="${p2.y}"
             stroke="yellow" stroke-width="0.02"
             />`;
        })
        .join('\n')}
    </svg>
    `;
    return svg;
}

export function setTilingPoints(shape: Tiling['shape'], points: Coord[]) {
    switch (shape.type) {
        case 'right-triangle':
            // second point is the right angle
            [shape.start, shape.corner, shape.end] = points;
            break;
        case 'isocelese':
            [shape.first, shape.second, shape.third] = points;
            break;
        case 'parallellogram':
            // second point is the bottom-right, first is bottom-left
            shape.points = points as [Coord, Coord, Coord, Coord];
            break;
    }
    return shape;
}

export function tilingPoints(shape: Tiling['shape']) {
    switch (shape.type) {
        case 'right-triangle':
            // second point is the right angle
            return [shape.start, shape.corner, shape.end];
        case 'isocelese':
            return [shape.first, shape.second, shape.third];
        case 'parallellogram':
            // second point is the bottom-right, first is bottom-left
            return shape.points;
    }
}

export function replicateStandard(full: [Coord, Coord][], ty: number) {
    full = full.concat(transformLines(full, [scaleMatrix(-1, 1), translationMatrix({x: 2, y: 0})]));
    full = full.concat(
        transformLines(full, [scaleMatrix(1, -1), translationMatrix({x: 0, y: ty * 2})]),
    );
    full.push(...transformLines(full, [scaleMatrix(1, -1)]));
    full.push(...transformLines(full, [scaleMatrix(-1, 1)]));
    return full;
}

export function getTransform(pts: Coord[]) {
    const [center, corner, top] = pts;

    const scale = 1 / dist(center, corner);
    const translate = scalePos(center, -1);
    const rotate = -angleTo(center, corner);
    const tx = [translationMatrix(translate), rotationMatrix(rotate), scaleMatrix(scale, scale)];
    const top_ = applyMatrices(top, tx);
    if (top_.y > 0) {
        tx.push(scaleMatrix(1, -1));
        top_.y *= -1;
    }
    return tx;
}
