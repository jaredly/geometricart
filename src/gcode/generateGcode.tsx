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

export const makeDepths = (
    start: number,
    depth: number,
    passDepth?: number,
) => {
    if (passDepth == null || passDepth < 0.001) {
        return [depth];
    }
    const depths = [];
    for (let i = start + passDepth; i <= depth; i += passDepth) {
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

type GCode =
    | { type: 'fast'; x?: number; y?: number; z?: number }
    | { type: 'tool'; diameter: number; vbitAngle?: number }
    | {
          type: 'cut';
          x?: number;
          y?: number;
          z?: number;
          f?: number;
          at?: number;
      }
    | { type: 'M0'; message: string }
    | { type: 'clear' };

export const generateGcode = (state: State, PathKit: PathKit) => {
    const clip = state.view.activeClip
        ? state.clips[state.view.activeClip]
        : undefined;

    const now = Date.now();
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
    console.log(`A ${Date.now() - now}ms`);

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

    const cmds: GCode[] = [];

    const { clearHeight, pauseHeight } = state.gcode;

    const FAST_SPEED = 500;
    let time = 0;

    let last = null as null | Coord;
    console.log(`B ${Date.now() - now}ms`);

    let lastTool = null as null | { diameter: number; vbitAngle?: number };

    state.gcode.items.forEach((item) => {
        if (item.type === 'pause') {
            cmds.push({ type: 'M0', message: item.message });
        } else {
            if (item.disabled) {
                return;
            }
            let { color, start, depth, speed, passDepth, tabs, vbitAngle } =
                item;
            if (!colors[color]) {
                console.warn(`Unknown color ${color}`);
                return;
            }
            const diameter =
                item.diameter ??
                (color.endsWith(':pocket')
                    ? 3
                    : pxToMM(+color.split(':')[1] / 100, state.meta.ppi));
            const cv = colors[color];

            if (vbitAngle != null) {
                depth = calculateDepthForVBit(
                    start,
                    (vbitAngle / 180) * Math.PI,
                    diameter,
                );
            }

            if (
                lastTool !== null &&
                (lastTool.diameter !== diameter ||
                    lastTool.vbitAngle !== vbitAngle)
            ) {
                console.log(
                    color,
                    diameter,
                    state.meta.ppi,
                    +color.split(':')[1],
                );
                cmds.push({ type: 'tool', diameter, vbitAngle });
            }
            lastTool = { diameter, vbitAngle };

            const greedy = greedyPaths(colors[color]);
            if (color.endsWith(':pocket')) {
                greedy.forEach((shape) => {
                    const pocket = makePocket(PathKit, shape.map(scalePos), 3);
                    if (!pocket.length || !pocket[0].length) {
                        console.log(pocket, shape);
                        debugger;
                    }

                    cmds.push({ type: 'clear' });
                    makeDepths(start ?? 0, depth, passDepth).forEach(
                        (itemDepth) => {
                            cmds.push({
                                type: 'fast',
                                x: pocket[0][0].x,
                                y: pocket[0][0].y,
                            });
                            cmds.push({ type: 'fast', z: 0 });
                            cmds.push({ type: 'cut', z: -itemDepth, f: speed });
                            pocket.forEach((round) => {
                                round.forEach((p) => {
                                    let travel = last ? dist(p, last) : null;
                                    if (travel) {
                                        time += travel! / speed;
                                    }
                                    cmds.push({
                                        type: 'cut',
                                        x: p.x,
                                        y: p.y,
                                        f: speed,
                                    });
                                    last = p;
                                });
                            });
                            cmds.push({ type: 'clear' });
                        },
                    );
                });
                return;
            }
            makeDepths(start ?? 0, depth, passDepth).forEach((itemDepth) => {
                greedy.forEach((shape) => {
                    const shapeCmds: GCode[] = [];
                    let distance = 0;
                    shape.forEach((pos, i) => {
                        const { x, y } = scalePos(pos);
                        let travel = last ? dist({ x, y }, last) : null;
                        if (travel) {
                            distance += travel;
                        }
                        if (i == 0) {
                            shapeCmds.push(
                                { type: 'clear' },
                                { type: 'fast', x, y },
                                { type: 'fast', z: 0 },
                                { type: 'cut', z: -itemDepth, f: speed },
                            );
                            if (travel) {
                                time += travel! / speed;
                            }
                        } else {
                            if (travel) {
                                time += travel! / speed;
                            }
                            shapeCmds.push({
                                type: 'cut',
                                x,
                                y,
                                f: speed,
                                at: distance,
                            });
                        }
                        last = { x, y };
                    });
                    if (tabs && itemDepth > tabs.depth) {
                        const { x, y } = scalePos(shape[0]);
                        let latest: {
                            at: number;
                            x: number;
                            y: number;
                        } = { at: 0, x, y };
                        let nextTabPos = { idx: 0, at: 0 };
                        for (let i = 0; i < shapeCmds.length; i++) {
                            const cmd = shapeCmds[i];
                            if (
                                cmd.type === 'cut' &&
                                cmd.x != null &&
                                cmd.y != null &&
                                cmd.at != null &&
                                cmd.at > nextTabPos.at
                            ) {
                                nextTabPos = {
                                    idx: nextTabPos.idx + 1,
                                    at:
                                        (distance / tabs.count) *
                                        (nextTabPos.idx + 1),
                                };

                                // ugh
                                const size = cmd.at - latest.at;
                                // const mid = size / 2;

                                const dx = cmd.x - latest.x;
                                const dy = cmd.y - latest.y;

                                const fullWidth =
                                    tabs.width + (lastTool?.diameter ?? 3);

                                const a = size / 2 - fullWidth / 2;
                                const b = a + fullWidth;
                                const da = a / size;
                                const db = b / size;

                                cmds.push(
                                    {
                                        type: 'cut',
                                        x: latest.x + dx * da,
                                        y: latest.y + dy * da,
                                        f: speed,
                                    },
                                    {
                                        type: 'fast',
                                        z: -itemDepth + tabs.depth,
                                    },
                                    {
                                        type: 'fast',
                                        x: latest.x + dx * db,
                                        y: latest.y + dy * db,
                                    },
                                    // cmd,
                                    { type: 'fast', z: -itemDepth },
                                    cmd,
                                );
                            } else {
                                cmds.push(cmd);
                            }
                            if (cmd.type === 'cut' && cmd.at != null) {
                                latest = {
                                    at: cmd.at,
                                    x: cmd.x ?? latest.x,
                                    y: cmd.y ?? latest.y,
                                };
                            }
                        }
                    } else {
                        cmds.push(...shapeCmds);
                    }
                });
            });
        }
    });
    console.log(`C ${Date.now() - now}ms`);

    const gcodePos = (x?: number, y?: number, z?: number, f?: number) => {
        const items: [string, number | void][] = [
            ['X', x],
            ['Y', y],
            ['Z', z],
            ['F', f],
        ];
        return items
            .filter((x) => x[1] != null)
            .map(([k, v]) => `${k}${v!.toFixed(3)}`)
            .join(' ');
    };

    lines.push(
        ...cmds.map((cmd) => {
            switch (cmd.type) {
                case 'tool':
                    return `G0Z30\nM0 ; tool ${cmd.diameter?.toFixed(2)}${
                        cmd.vbitAngle ? `v${cmd.vbitAngle.toFixed(2)}` : ''
                    }`;
                case 'fast':
                    return `G0 ${gcodePos(cmd.x, cmd.y, cmd.z)}`;
                case 'cut':
                    return `G1 ${gcodePos(cmd.x, cmd.y, cmd.z, cmd.f)}`;
                case 'M0':
                    return `M0 ;;; ${cmd.message}`;
                case 'clear':
                    return `G0 Z${clearHeight}`;
            }
        }),
    );

    lines.unshift(
        `; estimated time: ${time.toFixed(2)}m. Commands ${lines.length}`,
    );
    lines.push(`G0 Z${clearHeight}`);

    return { time, text: lines.join('\n') };
};

const calculateDepthForVBit = (
    start: number,
    diameter: number,
    angle: number,
) => {
    // const depth = diameter / 2 / Math.sin(angle / 2);
    // return start + depth;
    // return start + diameter * 8;
    return 3;
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
    // TODO: Consider using https://www.npmjs.com/package/svg-path-properties
    // or https://www.npmjs.com/package/point-at-length
    const div = document.createElement('div');
    div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
    const outer = div.firstElementChild as SVGSVGElement; // document.createElement('svg');
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

        const ok = false;
        if (ok) {
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
            svg.remove();
            const string = JSON.stringify(round);
            // No change 🤔
            if (string === last) {
                break;
            }
            last = string;

            rounds.push(round);
        } else {
            const round = cmdsToPoints(path.toCmds(), PathKit, outer);
            const string = JSON.stringify(round);
            // No change 🤔
            if (string === last) {
                break;
            }
            last = string;
            rounds.push(...round);
        }

        if (rounds.length > 100) {
            console.log(rounds);
            console.log(cmds);
            console.error('toom any rounds');
            break;
        }
    }
    path.delete();
    return rounds;
}

const svgPathPoints = (
    outer: SVGSVGElement,
    d: string,
    ppd: number = 0.2,
): Coord[] => {
    outer.innerHTML = `<path d="${d}" fill="red" stroke="black" />`;
    const path = outer.firstElementChild as SVGPathElement;
    const total = path.getTotalLength();
    const round = [];
    for (let i = 0; i < total; i += ppd) {
        const point = path.getPointAtLength(i);
        round.push({ x: point.x, y: point.y });
    }
    const point = path.getPointAtLength(total);
    round.push({ x: point.x, y: point.y });
    path.remove();
    return round;
};

// UGH it would be awesome to have access to SkCornerPathEffect
// for trimming down the corners.
// https://github.com/google/skia/blob/main/src/effects/SkCornerPathEffect.cpp
// https://github.com/google/skia/blob/main/modules/pathkit/pathkit_wasm_bindings.cpp#L358

const cmdsToPoints = (
    cmds: number[][],
    pk: PathKit,
    outer: SVGSVGElement,
): Coord[][] => {
    const points: Coord[][] = [];

    for (let cmd of cmds) {
        if (cmd[0] === pk.MOVE_VERB) {
            points.push([{ x: cmd[1], y: cmd[2] }]);
        } else if (cmd[0] === pk.LINE_VERB) {
            points[points.length - 1].push({ x: cmd[1], y: cmd[2] });
        } else if (cmd[0] === pk.CUBIC_VERB) {
            const current = points[points.length - 1];
            const last = current[current.length - 1];
            points[points.length - 1].push(
                ...svgPathPoints(
                    outer,
                    `M${last.x} ${last.y} C${cmd.slice(1).join(' ')}`,
                ),
            );
        } else if (cmd[0] === pk.QUAD_VERB) {
            const current = points[points.length - 1];
            const last = current[current.length - 1];
            points[points.length - 1].push(
                ...svgPathPoints(
                    outer,
                    `M${last.x} ${last.y} Q${cmd.slice(1).join(' ')}`,
                ),
            );
        } else if (cmd[0] === pk.CONIC_VERB) {
            const current = points[points.length - 1];
            const last = current[current.length - 1];

            const path = pk.FromCmds([[pk.MOVE_VERB, last.x, last.y], cmd]);
            points[points.length - 1].push(
                ...svgPathPoints(outer, path.toSVGString()),
            );
            path.delete();
        } else if (cmd[0] === pk.CLOSE_VERB) {
            points[points.length - 1].push({ ...points[points.length - 1][0] });
            continue;
        } else {
            throw new Error('unknown cmd ' + cmd[0]);
        }
    }

    return points.filter((m) => m.length);
};
