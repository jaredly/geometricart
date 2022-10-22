import { insetPath } from '../animation/getBuiltins';
import { findBoundingRect } from '../editor/Export';
import { findColorPaths } from './GCodeEditor';
import { dist } from '../rendering/getMirrorTransforms';
import { pathToPoints } from '../rendering/pathToPoints';
import { sortedVisibleInsetPaths } from '../rendering/sortedVisibleInsetPaths';
import { Coord, Path, State, StyleLine } from '../types';
import PathKitInit, { PathKit } from 'pathkit-wasm';
import { calcPathD } from '../editor/RenderPath';

const findClosest = (shape: Coord[], point: Coord) => {
    let best = null as null | [number, number];
    shape.forEach((p, i) => {
        const d = dist(p, point);
        if (best == null || d < best[0]) {
            best = [d, i];
        }
    });
    return { dist: best![0], idx: best![1] };
};

export const greedyPaths = (paths: Array<{ path: Path; style: StyleLine }>) => {
    const points: Array<Array<Coord>> = [];
    paths.forEach(({ path, style }) => {
        if (style.inset) {
            insetPath(path, style.inset).forEach((sub) => {
                points.push(pathToPoints(sub.segments));
            });
        } else {
            points.push(pathToPoints(path.segments));
        }
    });

    const ordered: Coord[][] = [];
    const first = points.shift()!;
    first.push(first[0]);
    ordered.push(first);
    while (points.length) {
        const last = ordered[ordered.length - 1];
        let point = last[last.length - 1];
        let best = null as null | { dist: number; idx: number; subIdx: number };
        points.forEach((shape, i) => {
            const closest = findClosest(shape, point);
            if (best == null || closest.dist < best.dist) {
                best = { dist: closest.dist, idx: i, subIdx: closest.idx };
            }
        });
        const next = points[best!.idx];
        points.splice(best!.idx, 1);
        const reordeeed = next
            .slice(best!.subIdx)
            .concat(next.slice(0, best!.subIdx));
        reordeeed.push(reordeeed[0]);
        ordered.push(reordeeed);
    }
    return ordered;
};

export const makeDepths = (depth: number, passDepth?: number) => {
    if (passDepth == null) {
        return [depth];
    }
    const depths = [];
    for (let i = passDepth; i <= depth; i += passDepth) {
        depths.push(Math.min(i, depth));
    }
    if (depths[depths.length - 1] < depth) {
        depths.push(depth);
    }
    return depths;
};

export const pxToMM = (value: number, ppi: number) => {
    return (value / ppi) * 250.4 * 6;
};

export const generateLaserInset = async (state: State) => {
    const PK = await PathKitInit({
        locateFile: (file) => '/node_modules/pathkit-wasm/bin/' + file,
    });

    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const insetPaths = sortedVisibleInsetPaths(
        state.paths,
        state.pathGroups,
        { next: () => 0.5 },
        clip,
        state.view.hideDuplicatePaths,
    );

    const full = PK.NewPath();

    insetPaths.forEach((path) => {
        const style = path.style;

        const d = calcPathD(path, state.view.zoom);

        style.lines.forEach((line, i) => {
            if (!line || line.color == null || !line.width) {
                return;
            }

            const pkpath = PK.FromSVGString(d);
            pkpath.stroke({
                width: line.width,
                join: PK.StrokeJoin.ROUND,
                cap: PK.StrokeCap.ROUND,
            });
            full.op(pkpath, PK.PathOp.UNION);
            pkpath.delete();
        });
    });

    const out = full.toSVGString();
    full.delete();
    return out;
};

export const generateGcode = (state: State, PathKit: PathKit) => {
    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const insetPaths = sortedVisibleInsetPaths(
        state.paths,
        state.pathGroups,
        { next: () => 0.5 },
        clip,
        state.view.hideDuplicatePaths,
        undefined,
        undefined,
        undefined,
    );

    const colors = findColorPaths(insetPaths);
    const bounds = findBoundingRect(state)!;

    const scalePos = ({ x, y }: Coord) => {
        return {
            x: pxToMM(x - bounds.x1, state.meta.ppi),
            y: pxToMM(y - bounds.y1, state.meta.ppi),
        };
    };

    const lines: Array<string> = [
        'G21 ; units to mm',
        'G90 ; absolute positioning',
        'G17 ; xy plane',
    ];
    const { clearHeight, pauseHeight } = state.gcode;

    const FAST_SPEED = 500;
    let time = 0;

    let last = null as null | Coord;

    state.gcode.items.forEach((item) => {
        if (item.type === 'pause') {
            lines.push(`G0 Z${pauseHeight}`, `M0 ;;; ${item.message}`);
        } else {
            const { color, depth, speed, passDepth } = item;
            if (!colors[color]) {
                console.warn(`Unknown color ${color}`);
                return;
            }
            const greedy = greedyPaths(colors[color]);
            if (color.endsWith(':pocket')) {
                greedy.forEach((shape) => {
                    const pocket = makePocket(PathKit, shape.map(scalePos), 3);

                    lines.push(`G0 Z${clearHeight}`);
                    // lines.push(`G0 X${pocket[0][0].x} Y${pocket[0][0].y}`);
                    // lines.push(`G0 Z0`);
                    makeDepths(depth, passDepth).forEach((itemDepth) => {
                        lines.push(
                            `G0 X${pocket[0][0].x.toFixed(
                                3,
                            )} Y${pocket[0][0].y.toFixed(3)}`,
                        );
                        lines.push(`G0 Z0`);
                        lines.push(`G1 Z${-itemDepth} F${speed}`);
                        pocket.forEach((round) => {
                            round.forEach((p) => {
                                let travel = last ? dist(p, last) : null;
                                if (travel) {
                                    time += travel! / speed;
                                }
                                lines.push(
                                    `G1 X${p.x.toFixed(3)} Y${p.y.toFixed(
                                        3,
                                    )} F${speed}`,
                                );
                                last = p;
                            });
                        });
                        lines.push(`G0 Z${clearHeight}`);
                    });
                });
                return;
            }
            makeDepths(depth, passDepth).forEach((itemDepth) => {
                greedy.forEach((shape) => {
                    shape.forEach((pos, i) => {
                        const { x, y } = scalePos(pos);
                        let travel = last ? dist({ x, y }, last) : null;
                        if (i == 0) {
                            lines.push(
                                `G0 Z${clearHeight}`,
                                `G0 X${x.toFixed(3)} Y${y.toFixed(3)}`,
                                `G0 Z0`,
                                `G1 Z${-itemDepth} F${speed}`,
                            );
                            if (travel) {
                                time += travel! / speed;
                            }
                        } else {
                            if (travel) {
                                time += travel! / speed;
                            }
                            lines.push(
                                `G1 X${x.toFixed(3)} Y${y.toFixed(
                                    3,
                                )} F${speed}`,
                            );
                        }
                        last = { x, y };
                    });
                });
            });
        }
    });

    lines.unshift(`; estimated time: ${time.toFixed(2)}s`);
    lines.push(`G0 Z${clearHeight}`);

    return { time, text: lines.join('\n') };
};

function makePocket(PathKit: PathKit, shape: Coord[], bitSize: number) {
    const path = PathKit.NewPath();
    shape.forEach(({ x, y }, i) => {
        if (i === 0) {
            path.moveTo(x, y);
        } else {
            path.lineTo(x, y);
        }
    });
    path.close();

    const rounds: Coord[][] = [];

    path.simplify();
    // const outer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // TODO: Consider using https://www.npmjs.com/package/svg-path-properties
    // or https://www.npmjs.com/package/point-at-length
    const div = document.createElement('div');
    div.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" ></svg>
    `;
    const outer = div.firstElementChild as SVGSVGElement; // document.createElement('svg');
    // outer.setAttributeNS(
    //     'http://www.w3.org/2000/xmlns/',
    //     'xmlns:xlink',
    //     'http://www.w3.org/1999/xlink',
    // );
    // outer.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // document.body.append(outer);
    let last = null;
    while (true) {
        const stroke = path.copy().stroke({
            width: bitSize, // * 1.3,
            cap: PathKit.StrokeCap.ROUND,
            join: PathKit.StrokeJoin.ROUND,
        });
        path.op(stroke, PathKit.PathOp.DIFFERENCE);
        stroke.delete();
        path.simplify();

        const cmds = path.toCmds();
        if (!cmds.length) {
            break;
        }

        outer.innerHTML = `<path d="${path.toSVGString()}" fill="red" stroke="black" />`;
        const svg = outer.firstElementChild as SVGPathElement;
        const total = svg.getTotalLength();
        const round = [];
        // erm, fix straight lines probably
        for (let i = 0; i < total; i += 0.2) {
            const point = svg.getPointAtLength(i);
            round.push({ x: point.x, y: point.y });
        }
        const point = svg.getPointAtLength(total);
        round.push({ x: point.x, y: point.y });
        const string = JSON.stringify(round);
        // No change 🤔
        if (string === last) {
            break;
        }
        last = string;
        rounds.push(round);

        svg.remove();

        // const cmds = path.toCmds();
        // if (!cmds.length) {
        //     console.log('done');
        //     break;
        // }
        // rounds.push(cmdsToPoints(cmds, PathKit));
        if (rounds.length > 100) {
            console.log(rounds);
            console.log(cmds);
            console.error('toom any rounds');
            // throw new Error('too many rounds');
            break;
        }
    }
    path.delete();
    return rounds;
}

const cmdsToPoints = (cmds: number[][], pk: PathKit): Coord[] => {
    const points: Coord[] = [];

    for (let cmd of cmds) {
        if (cmd[0] === pk.MOVE_VERB) {
            if (points.length) {
                console.warn(`multiple moves`);
                break;
            }
            // points.push({x: cmd[1], y: cmd[2]})
        } else if (cmd[0] === pk.LINE_VERB) {
            points.push({ x: cmd[1], y: cmd[2] });
        } else if (cmd[0] === pk.CUBIC_VERB) {
            // points.push({ x: cmd[5], y: cmd[6] });
            console.warn('cubic');
        } else if (cmd[0] === pk.QUAD_VERB) {
            // points.push({ x: cmd[3], y: cmd[4] });
            console.warn('quad');
        } else if (cmd[0] === pk.CONIC_VERB) {
            console.warn('conic');
            // points.push({ x: cmd[5], y: cmd[6] });
        } else if (cmd[0] === pk.CLOSE_VERB) {
            break;
        } else {
            throw new Error('unknown cmd ' + cmd[0]);
        }
    }

    return points;
};
