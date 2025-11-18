import {test, expect} from 'bun:test';
import {memoryUsage, fullGC, heapStats} from 'bun:jsc';
import {generateHeapSnapshot} from 'bun';
import {Tiling} from '../types';
import {canvasTiling} from './canvasTiling';
import {getNewPatternData, getPatternData} from './getPatternData';
import {normalizeTilingShape, tilingPoints} from '../editor/tilingPoints';

const veryBasicTiling: Tiling = {
    shape: {
        type: 'right-triangle',
        start: {x: 0, y: 0},
        corner: {x: 1, y: 3.269436733918088e-15},
        end: {x: 1, y: -0.9999999999999926},
        rotateHypotenuse: false,
    },
    cache: {
        hash: '6c673756253fe527c3b2438b1e882957e10f030c',
        segments: [
            {
                prev: {x: 0.49999999999999956, y: -0.49999999999999517},
                segment: {type: 'Line', to: {x: 0.7071068286895721, y: 3.5094158730799896e-15}},
            },
            {
                prev: {x: 1.0000000298023206, y: -0.7071067988872453},
                segment: {type: 'Line', to: {x: 0.49999999999999956, y: -0.49999999999999517}},
            },
        ],
        shapes: [],
    },
    id: 'id-130',
};

const maxHeap = () => {
    const maxSize = generateHeapSnapshot();
    let m = 0;
    maxSize.nodes.forEach((node) => {
        if (node > m) m = node;
    });
    return m;
};

test('Memory usage', async () => {
    // await canvasTiling(getPatternData(veryBasicTiling), 100, true, {});
    Bun.gc(true);
    const before = maxHeap();

    // looks like 3mb per pattern?
    for (let i = 0; i < 1000; i++) {
        const data = getNewPatternData(veryBasicTiling);
        await canvasTiling(data, 100, true, {});
    }

    Bun.gc(true);
    const after = maxHeap();
    // const after = memoryUsage().current;
    // expect((after - before) / 1000_1000).toBeLessThan(0.1);
    console.log(before, after);
    expect(after).toEqual(before);
});
