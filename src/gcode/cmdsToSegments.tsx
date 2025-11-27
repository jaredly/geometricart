import {angleTo, applyMatrices, dist, Matrix, push} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {pk} from '../routes/pk';
import {conic2D, cubicBezier2D, evalQuad} from '../routes/screens/animator.screen/splitSegment';
import {BarePath, Coord, Segment} from '../types';

export const cmdsToCoords = (
    cmds: number[] | Float32Array,
    evnum = 10,
): {points: Coord[]; open: boolean}[] => {
    const lines: {points: Coord[]; open: boolean}[] = [];

    for (let i = 0; i < cmds.length; ) {
        if (cmds[i] === pk.MOVE_VERB) {
            i++;
            lines.push({points: [{x: cmds[i++], y: cmds[i++]}], open: true});
            continue;
        }
        const points = lines[lines.length - 1].points;
        const latest = points[points.length - 1];
        switch (cmds[i++]) {
            case pk.MOVE_VERB:
                break;
            case pk.LINE_VERB: {
                const to = {x: cmds[i++], y: cmds[i++]};
                if (coordsEqual(to, latest)) {
                    continue;
                }
                points.push(to);
                break;
            }
            case pk.CUBIC_VERB: {
                const values: number[] = [];
                for (let j = 0; j < 6; j++) {
                    values.push(cmds[i++]);
                }
                const [cx1, cy1, cx2, cy2, x, y] = values;
                for (let i = 1; i < evnum; i++) {
                    points.push(
                        cubicBezier2D(
                            i / evnum,
                            latest,
                            {x: cx1, y: cy1},
                            {x: cx2, y: cy2},
                            {x, y},
                        ),
                    );
                }
                points.push({x, y});
                break;
            }
            case pk.QUAD_VERB: {
                const values: number[] = [];
                for (let j = 0; j < 4; j++) {
                    values.push(cmds[i++]);
                }
                const [cx1, cy1, x, y] = values;
                for (let i = 1; i < evnum; i++) {
                    points.push(evalQuad(latest, {x: cx1, y: cy1}, {x, y}, i / evnum));
                }
                points.push({x, y});
                break;
            }
            case pk.CONIC_VERB: {
                const values: number[] = [];
                for (let j = 0; j < 5; j++) {
                    values.push(cmds[i++]);
                }
                const [ctrlx, ctrly, x, y, w] = values;
                for (let i = 1; i < evnum; i++) {
                    points.push(conic2D(i / evnum, latest, {x: ctrlx, y: ctrly}, {x, y}, w));
                }
                points.push({x, y});
                break;
            }
            case pk.CLOSE_VERB: {
                lines[lines.length - 1].open = false;
                continue;
            }
            default:
                throw new Error(`unknown cmd ${cmds[i - 1]}`);
        }
    }

    return lines;
};

export const cmdsToSegments = (cmds: number[]): BarePath[] => {
    const points: {segments: Segment[]; origin: Coord; open: boolean}[] = [];

    for (let i = 0; i < cmds.length; ) {
        const latest = points[points.length - 1];
        switch (cmds[i++]) {
            case pk.MOVE_VERB:
                points.push({segments: [], origin: {x: cmds[i++], y: cmds[i++]}, open: true});
                break;
            case pk.LINE_VERB: {
                const to = {x: cmds[i++], y: cmds[i++]};
                if (latest.segments.length === 0 && coordsEqual(to, latest.origin)) {
                    continue;
                }
                latest.segments.push({
                    type: 'Line',
                    to,
                });

                break;
            }
            case pk.CUBIC_VERB: {
                const values: number[] = [];
                for (let j = 0; j < 6; j++) {
                    values.push(cmds[i++]);
                }
                const [cx1, cy1, cx2, cy2, x, y] = values;
                latest.segments.push({
                    type: 'Line',
                    to: {x, y},
                });

                break;
            }
            case pk.QUAD_VERB: {
                const values: number[] = [];
                for (let j = 0; j < 4; j++) {
                    values.push(cmds[i++]);
                }
                const [cx1, cy1, x, y] = values;
                latest.segments.push({
                    type: 'Quad',
                    control: {x: cx1, y: cy1},
                    to: {x, y},
                });
                break;
            }
            case pk.CONIC_VERB: {
                const values: number[] = [];
                for (let j = 0; j < 5; j++) {
                    values.push(cmds[i++]);
                }
                const [ctrlx, ctrly, x, y, w] = values;

                // From the Skia source, the way weight is calculated when converting an Arc
                // SkScalar w = SkScalarSqrt(SK_ScalarHalf + SkScalarCos(thetaWidth) * SK_ScalarHalf);
                const dt = Math.acos((w * w - 0.5) / 0.5);

                const prev =
                    latest.segments.length > 0
                        ? latest.segments[latest.segments.length - 1].to
                        : latest.origin;
                const ctrl = {x: ctrlx, y: ctrly};
                const to = {x, y};

                const cp = angleTo(to, ctrl);
                const prev_to = angleTo(to, prev);

                const midp = {x: (prev.x + to.x) / 2, y: (prev.y + to.y) / 2};

                const d_between = dist(prev, to);
                const r = (d_between / 2 / Math.sin(dt / 2)) * Math.cos(dt / 2);

                const ab = angleBetween(cp, prev_to, true);
                const center = push(midp, prev_to + (Math.PI / 2) * (ab > Math.PI ? -1 : 1), r);

                latest.segments.push({
                    type: 'Arc',
                    center: center,
                    clockwise: ab > Math.PI,
                    to: {x, y},
                });
                break;
            }
            case pk.CLOSE_VERB: {
                latest.open = false;
                // Don't need this,
                if (
                    latest.segments.length &&
                    !coordsEqual(latest.segments[latest.segments.length - 1].to, latest.origin)
                ) {
                    latest.segments.push({
                        type: 'Line',
                        to: latest.origin,
                    });
                }

                continue;
            }
            default:
                throw new Error(`unknown cmd ${cmds[i - 1]}`);
        }
    }

    return points.filter((m) => m.segments.length);
};

export const transformCmds = (cmds: number[], mx: Matrix[]) => {
    const txpos = (i: number) => {
        const {x, y} = applyMatrices({x: cmds[i], y: cmds[i + 1]}, mx);
        cmds[i] = x;
        cmds[i + 1] = y;
    };
    for (let i = 0; i < cmds.length; ) {
        switch (cmds[i++]) {
            case pk.MOVE_VERB:
                txpos(i);
                i += 2;
                break;
            case pk.LINE_VERB: {
                txpos(i);
                i += 2;
                break;
            }
            case pk.CUBIC_VERB: {
                txpos(i);
                i += 2;
                txpos(i);
                i += 2;
                txpos(i);
                i += 2;
                break;
            }
            case pk.QUAD_VERB: {
                txpos(i);
                i += 2;
                txpos(i);
                i += 2;
                break;
            }
            case pk.CONIC_VERB: {
                txpos(i);
                i += 2;
                txpos(i);
                i += 3;
                break;
            }
            case pk.CLOSE_VERB: {
                continue;
            }
            default:
                throw new Error(`unknown cmd ${cmds[i - 1]}`);
        }
    }
};
