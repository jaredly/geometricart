import {epsilon} from '../src/rendering/epsilonToZero';
import {
    angleTo,
    dist,
    rotationMatrix,
    scaleMatrix,
    translationMatrix,
} from '../src/rendering/getMirrorTransforms';
import {angleBetween} from '../src/rendering/isAngleBetween';
import {db, getAllPatterns, saveAllPatterns} from '../src/routes/db.server';
import {
    cutSegments,
    flipPattern,
    removeOverlappingSegs,
    splitOverlappingSegs,
} from '../src/routes/shapesFromSegments';
import {Coord, Tiling} from '../src/types';

const patterns = getAllPatterns();
const toSave: {tiling: Tiling; hash: string}[] = [];

const doFlipPatterns = () => {
    patterns.forEach((pattern) => {
        const tiling = flipPattern(pattern.tiling);
        if (tiling !== pattern.tiling) {
            toSave.push({...pattern, tiling});
        }
    });
};

const doCutSegments = () => {
    for (let pattern of patterns) {
        let segs = pattern.tiling.cache.segments.map(
            (s) => [s.prev, s.segment.to] as [Coord, Coord],
        );
        const lens = segs.map(([a, b]) => dist(a, b));
        const max = Math.max(...lens);
        const perc = lens.map((l) => Math.round((l / max) * 100));
        console.log(perc.sort((a, b) => a - b).join(', '));
        segs = cutSegments(segs);
        segs = splitOverlappingSegs(segs);
        // if (
        //     segs.length !== pattern.tiling.cache.segments.length
        // ) {
        console.log('more segs', pattern.hash, segs.length, pattern.tiling.cache.segments.length);
        pattern.tiling.cache.segments = segs.map(([a, b]) => ({
            prev: a,
            segment: {type: 'Line', to: b},
        }));
        toSave.push(pattern);
        // }
    }
};

doFlipPatterns();
console.log(
    `need to save ${toSave.length}`,
    toSave.map((s) => s.hash),
);
// saveAllPatterns(toSave);
db.close();
