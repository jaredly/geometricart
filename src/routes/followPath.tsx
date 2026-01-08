import {coordKey} from '../rendering/coordKey';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Coord} from '../types';
import {SegLink} from './shapesFromSegments';
import {calculateIntersections, Inter} from './weaveIntersections';

const followSinglePath = (
    int0: Inter,
    seg0: number,
    first: boolean,
    segInts: string[][],
    intersections: Record<string, Inter>,
    maxPathLength = 2000,
    usedSegments?: Set<number>,
): undefined | {points: Coord[]; open?: boolean} => {
    const points = [{int: int0, seg: seg0}];
    const used = {[int0.key]: true};
    while (points.length < maxPathLength) {
        const prev = points[points.length - 1];
        const next = prev.int.exits.find((seg) => seg !== prev.seg);
        if (next == null || !segInts[next]) {
            if (first) {
                const second = followSinglePath(int0, int0.exits[1], false, segInts, intersections);
                if (second) {
                    if (second.open) {
                        second.points.unshift(...points.map((p) => p.int.pos));
                    }
                    return second;
                }
            }
            // console.log('no seg', next);
            // return;
            return {points: points.map((p) => p.int.pos), open: true};
        }
        usedSegments?.add(next);
        const [left, right] = segInts[next]!;
        const neighbor = left === prev.int.key ? right : left;
        const int = intersections[neighbor];
        if (int.pathId !== int0.pathId) {
            // console.log('reached a different path');
            if (first) {
                const second = followSinglePath(int0, int0.exits[1], false, segInts, intersections);
                if (second) {
                    if (second.open) {
                        second.points.unshift(...points.map((p) => p.int.pos).reverse());
                    }
                    return second;
                }
            }

            return {points: points.map((p) => p.int.pos), open: true};
        }
        if (int.key === points[0].int.key) {
            console.log('got to the top', points);
            return {points: points.map((p) => p.int.pos)};
        }
        if (used[int.key]) {
            console.log('nope');
            return {points: points.map((p) => p.int.pos)};
        }
        used[int.key] = true;
        // if (coordsEqual(int.pos, points[0].pos)) {
        //     console.log('got to the top', points);
        //     return points.map((p) => p.pos);
        // }
        points.push({int, seg: next});
    }
    console.log('ran out of points', points.length);
};

export const collectAllPaths = (links: SegLink[], segs: [Coord, Coord][]) => {
    const {intersections, segInts, weird} = calculateIntersections(segs, links);

    const usedSegments: Set<number> = new Set();

    const collected: {points: Coord[]; open?: boolean; pathId?: number}[] = [];
    Object.values(intersections).forEach((int) => {
        const ready = int.exits.filter((s) => !usedSegments.has(s));
        if (ready.length !== 2) {
            return; // yeah just not dealing wth that right now
        }
        const oneSide = followSinglePath(
            int,
            ready[0],
            true,
            segInts,
            intersections,
            undefined,
            usedSegments,
        );
        if (oneSide) {
            collected.push({...oneSide, pathId: links[ready[0]]?.pathId});
        }
    });

    return collected;
};

export const followPath = (links: SegLink[], segs: [Coord, Coord][], start: Coord) => {
    const {intersections, segInts, weird} = calculateIntersections(segs, links);

    const int = Object.values(intersections).find((int) => coordsEqual(int.pos, start));
    if (!int) {
        console.log('couldnt find an intersection for the pos', start);
        console.log(intersections, links);
        return;
    }
    if (int.exits.length !== 2) {
        console.log('two-intersection please');
        return;
    }

    return followSinglePath(int, int.exits[0], true, segInts, intersections);
};
