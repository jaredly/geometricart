import {angleTo, dist, push} from '../rendering/getMirrorTransforms';
import {BarePath, Coord, Segment} from '../types';
import {PathKit} from 'pathkit-wasm';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {angleBetween} from '../rendering/isAngleBetween';
import {pk} from '../routes/pk';

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

    // for (let cmd of cmds) {
    //     const latest = points[points.length - 1];
    //     if (cmd[0] === pk.MOVE_VERB) {
    //         const [_, x, y] = cmd;
    //         points.push({segments: [], origin: {x, y}, open: true});
    //     } else if (cmd[0] === pk.LINE_VERB) {
    //         const [_, x, y] = cmd;
    //         const to = {x, y};
    //         if (latest.segments.length === 0 && coordsEqual(to, latest.origin)) {
    //             continue;
    //         }
    //         latest.segments.push({
    //             type: 'Line',
    //             to,
    //         });
    //     } else if (cmd[0] === pk.CUBIC_VERB) {
    //         const [_, cx1, cy1, cx2, cy2, x, y] = cmd;
    //         latest.segments.push({
    //             type: 'Line',
    //             to: {x, y},
    //         });
    //     } else if (cmd[0] === pk.QUAD_VERB) {
    //         const [_, cx1, cy1, x, y] = cmd;
    //         latest.segments.push({
    //             type: 'Quad',
    //             control: {x: cx1, y: cy1},
    //             to: {x, y},
    //         });
    //     } else if (cmd[0] === pk.CONIC_VERB) {
    //         const [_, ctrlx, ctrly, x, y, w] = cmd;

    //         // From the Skia source, the way weight is calculated when converting an Arc
    //         // SkScalar w = SkScalarSqrt(SK_ScalarHalf + SkScalarCos(thetaWidth) * SK_ScalarHalf);
    //         const dt = Math.acos((w * w - 0.5) / 0.5);

    //         const prev =
    //             latest.segments.length > 0
    //                 ? latest.segments[latest.segments.length - 1].to
    //                 : latest.origin;
    //         const ctrl = {x: ctrlx, y: ctrly};
    //         const to = {x, y};

    //         const cp = angleTo(to, ctrl);
    //         const prev_to = angleTo(to, prev);

    //         const midp = {x: (prev.x + to.x) / 2, y: (prev.y + to.y) / 2};

    //         const d_between = dist(prev, to);
    //         const r = (d_between / 2 / Math.sin(dt / 2)) * Math.cos(dt / 2);

    //         const ab = angleBetween(cp, prev_to, true);
    //         const center = push(midp, prev_to + (Math.PI / 2) * (ab > Math.PI ? -1 : 1), r);

    //         latest.segments.push({
    //             type: 'Arc',
    //             center: center,
    //             clockwise: ab > Math.PI,
    //             to: {x, y},
    //         });
    //     } else if (cmd[0] === pk.CLOSE_VERB) {
    //         latest.open = false;
    //         // Don't need this,
    //         if (
    //             latest.segments.length &&
    //             !coordsEqual(latest.segments[latest.segments.length - 1].to, latest.origin)
    //         ) {
    //             latest.segments.push({
    //                 type: 'Line',
    //                 to: latest.origin,
    //             });
    //         }
    //         continue;
    //     } else {
    //         throw new Error('unknown cmd ' + cmd[0]);
    //     }
    // }

    return points.filter((m) => m.segments.length);
};
