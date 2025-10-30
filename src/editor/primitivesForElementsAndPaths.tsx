import {lineToSlope, Primitive} from '../rendering/intersect';
import {geomToPrimitives} from '../rendering/points';
import {primitiveKey} from '../rendering/coordKey';
import {angleTo, dist} from '../rendering/getMirrorTransforms';
import {GuideElement, Id, Path} from '../types';

export function primitivesForElementsAndPaths(
    guideElements: GuideElement[],
    paths: Array<Path>,
): Array<{prim: Primitive; guides: Array<Id>}> {
    const seen: {[key: string]: Array<Id>} = {};
    return ([] as Array<{prim: Primitive; guide: Id}>)
        .concat(
            ...guideElements.map((el: GuideElement) =>
                geomToPrimitives(el.geom).map((prim) => ({
                    prim,
                    guide: el.id,
                })),
            ),
        )
        .map((prim) => {
            const k = primitiveKey(prim.prim);
            if (seen[k]) {
                seen[k].push(prim.guide);
                return null;
            }
            seen[k] = [prim.guide];
            return {prim: prim.prim, guides: seen[k]};
        })
        .concat(
            paths
                .map((path) => {
                    return path.segments.map(
                        (seg, i): null | {prim: Primitive; guides: Array<Id>} => {
                            const prev = i === 0 ? path.origin : path.segments[i - 1].to;
                            let prim: Primitive;
                            if (seg.type === 'Line') {
                                prim = lineToSlope(prev, seg.to, true);
                            } else if (seg.type === 'Quad') {
                                throw new Error('noa');
                            } else {
                                const t0 = angleTo(seg.center, prev);
                                const t1 = angleTo(seg.center, seg.to);
                                prim = {
                                    type: 'circle',
                                    center: seg.center,
                                    radius: dist(seg.center, seg.to),
                                    limit: seg.clockwise ? [t0, t1] : [t1, t0],
                                };
                            }
                            const k = primitiveKey(prim);
                            if (seen[k]) {
                                return null;
                            }
                            seen[k] = [];
                            return {prim, guides: seen[k]};
                        },
                    );
                })
                .flat(),
        )
        .filter(Boolean) as Array<{prim: Primitive; guides: Array<Id>}>;
}