import { insetPath } from './animation/getBuiltins';
import { findBoundingRect } from './editor/Export';
import { findColorPaths } from './GCodeEditor';
import { dist } from './rendering/getMirrorTransforms';
import { pathToPoints } from './rendering/pathToPoints';
import { sortedVisibleInsetPaths } from './rendering/sortedVisibleInsetPaths';
import { Coord, Path, State, StyleLine } from './types';
import PathKitInit, * as PathKit from 'pathkit-wasm';
import { calcPathD } from './editor/RenderPath';

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

export const generateGcode = (state: State) => {
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
            const greedy = greedyPaths(colors[color]);
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

    return { time, text: lines.join('\n') };
};
