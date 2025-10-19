import { dist } from "../src/rendering/getMirrorTransforms";
import { db, getAllPatterns, saveAllPatterns } from "../src/routes/db.server";
import { cutSegments, removeOverlappingSegs, splitOverlappingSegs } from "../src/routes/shapesFromSegments";
import { Coord } from "../src/types";


const patterns = getAllPatterns()
const toSave = []
for (let pattern of patterns) {
    let segs = pattern.tiling.cache.segments
        .map(s => [s.prev, s.segment.to] as [Coord,Coord])

    const lens = segs.map(([a,b]) => dist(a,b))
    const max = Math.max(...lens)
    const perc = lens.map(l => Math.round(l / max * 100))
    console.log(perc.sort((a, b) => a -  b).join(', '))

    segs = cutSegments(segs)
    segs = splitOverlappingSegs(segs)
    // if (
    //     segs.length !== pattern.tiling.cache.segments.length
    // ) {
        console.log('more segs', pattern.hash, segs.length, pattern.tiling.cache.segments.length)
        pattern.tiling.cache.segments = segs.map(([a, b]) => ({prev: a, segment: {type: 'Line', to: b}}))
        toSave.push(pattern)
    // }
}
// console.log(`need to save ${toSave.length}`, toSave.map(s => s.hash))
saveAllPatterns(toSave)
db.close()