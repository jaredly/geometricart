import { Coord } from '../types';
import { closeEnough } from '../rendering/epsilonToZero';
import {
    Matrix,
    angleTo,
    applyMatrices,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../rendering/getMirrorTransforms';
import { scalePos } from './scalePos';

export const transformLines = (lines: [Coord, Coord][], mx: Matrix[]) =>
    lines.map(([p1, p2]): [Coord, Coord] => [
        applyMatrices(p1, mx),
        applyMatrices(p2, mx),
    ]);

export function eigenShapesToLines(
    unique: [Coord, Coord][],
    flip: boolean,
    tr: Coord,
) {
    let full = unique;
    if (flip) {
        full = full.concat(
            transformLines(full, [
                rotationMatrix(Math.PI),
                translationMatrix(tr),
            ]),
        );
        full = replicateStandard(full, tr.y);
    } else if (closeEnough(tr.y, -1 / Math.sqrt(3))) {
        full = full.concat(
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-(Math.PI / 3)),
            ]),
        );
        full = full.concat(
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-(Math.PI / 3) * 2),
            ]),
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-Math.PI),
            ]),
        );
        full = full.concat(transformLines(full, [scaleMatrix(1, -1)]));
        full = full.concat(
            ...[0, 1, 2, 3, 4, 5].map((i) =>
                transformLines(full, [
                    translationMatrix({ x: 2, y: 0 }),
                    rotationMatrix((Math.PI / 3) * i),
                ]),
            ),
        );
    } else {
        full = full.concat(
            transformLines(full, [
                scaleMatrix(1, -1),
                rotationMatrix(-Math.PI / 2),
            ]),
        );
        full = replicateStandard(full, tr.y);
    }

    return full;
}

export function eigenShapesToSvg(
    unique: [Coord, Coord][],
    flip: boolean,
    tr: Coord,
    tpts: Coord[],
) {
    let full = eigenShapesToLines(unique, flip, tr);

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="50" style="background:black" height="50" viewBox="-2.5 -2.5 5 5">
    <path
        d="${tpts
            .map(
                ({ x, y }, i) =>
                    `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`,
            )
            .join(' ')}Z"
        fill="rgb(50,50,50)"
        stroke="none"
    />
    ${full
        .map(([p1, p2]) => {
            return `<line
            stroke-linecap='round' stroke-linejoin='round'
             x1="${p1.x}" x2="${p2.x}" y1="${p1.y}" y2="${p2.y}" stroke="yellow" stroke-width="0.02"/>`;
        })
        .join('\n')}
    </svg>
    `;
    return svg;
}

export function tilingPoints(
    shape:
        | {
              type: 'right-triangle';
              rotateHypotenuse: boolean;
              start: Coord;
              corner: Coord;
              end: Coord;
          }
        | { type: 'isocelese'; first: Coord; second: Coord; third: Coord },
) {
    return shape.type === 'right-triangle'
        ? [shape.start, shape.corner, shape.end]
        : [shape.first, shape.second, shape.third];
}

export function replicateStandard(full: [Coord, Coord][], ty: number) {
    full = full.concat(
        transformLines(full, [
            scaleMatrix(-1, 1),
            translationMatrix({ x: 2, y: 0 }),
        ]),
    );
    full = full.concat(
        transformLines(full, [
            scaleMatrix(1, -1),
            translationMatrix({ x: 0, y: ty * 2 }),
        ]),
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
    const tx = [
        translationMatrix(translate),
        rotationMatrix(rotate),
        scaleMatrix(scale, scale),
    ];
    const top_ = applyMatrices(top, tx);
    if (top_.y > 0) {
        tx.push(scaleMatrix(1, -1));
        top_.y *= -1;
    }
    return tx;
}
