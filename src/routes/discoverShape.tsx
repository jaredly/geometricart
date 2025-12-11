import {coordKey} from '../rendering/coordKey';
import {negPiToPi} from '../rendering/epsilonToZero';
import {angleBetween} from '../rendering/isAngleBetween';
import {coordsEqual} from '../rendering/pathsAreIdentical';
import {Coord} from '../types';
import {barePathFromCoords, LogItem, RenderLog} from './screens/pattern.screen/resolveMods';
import {EndPointMap} from './shapesFromSegments';

export const discoverShape = (
    point: Coord,
    seg: {idx: number; theta: number; to: Coord},
    used: Record<string, true>,
    byEndPoint: EndPointMap,
    clockwise = true,
    maxPoints = 1000,
    log?: RenderLog[],
) => {
    // const log = [];
    let at = seg;
    const points = [point, seg.to];
    const pks: string[] = [coordKey(seg.to)];
    let ranout = false;
    const items: {item: LogItem; text?: string}[] | undefined = log
        ? [
              {item: {type: 'point', p: point}, text: coordKey(point)},
              {item: {type: 'seg', prev: point, seg: {type: 'Line', to: seg.to}}},
          ]
        : undefined;
    // const slog: RenderLog[] | undefined = log ? [{type: 'items', title: 'Point', items: [
    // ]}] : undefined
    if (log) log.push({type: 'items', items: items!, title: `Discover shape`});
    while (points.length < maxPoints) {
        const nexts = byEndPoint[coordKey(at.to)].exits
            .filter((seg) => !pks.includes(coordKey(seg.to)))
            .filter((seg) => !coordsEqual(seg.to, points[points.length - 2]))
            .map((seg) => ({
                seg,
                cctheta: angleBetween(negPiToPi(at.theta + Math.PI), seg.theta, clockwise),
            }))
            .sort((a, b) => a.cctheta - b.cctheta);
        // log.push({at, nexts, points: [...points], considered: byEndPoint[coordKey(at.to)].exits});
        items?.push({item: {type: 'shape', shape: barePathFromCoords(points)}});

        if (!nexts.length) {
            ranout = true;
            break;
        }
        const next = nexts[0];
        // if (nexts.length > 1 && closeEnough(nexts[1].cctheta, next.cctheta)) {
        //     // throw new Error(`overlalappap`);
        //     console.log('overlllap', nexts);
        // }
        const sk = `${coordKey(at.to)}:${coordKey(next.seg.to)}`;
        // if (used[sk]) {
        //     console.warn(`somehow double-using a segment`, sk);
        // }
        used[sk] = true;

        if (coordsEqual(points[0], next.seg.to)) {
            break;
        }

        at = next.seg;
        points.push(at.to);
        pks.push(coordKey(at.to));
    }

    return {points, ranout};
};
