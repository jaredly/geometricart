import { db, getAllPatterns, saveAllPatterns } from "../src/routes/db.server";
import { cutSegments } from "../src/routes/shapesFromSegments";

export {};

const patterns = getAllPatterns()
const toSave = []
for (let pattern of patterns) {
    const splitted = cutSegments(pattern.tiling.cache.segments
        .map(s => [s.prev, s.segment.to])
    )
    if (splitted.length > pattern.tiling.cache.segments.length) {
        console.log('more segs', pattern.hash, splitted.length, pattern.tiling.cache.segments.length)
        pattern.tiling.cache.segments = splitted.map(([a, b]) => ({prev: a, segment: {type: 'Line', to: b}}))
        toSave.push(pattern)
    }
}
console.log(`need to save ${toSave.length}`, toSave.map(s => s.hash))
saveAllPatterns(toSave)
db.close()