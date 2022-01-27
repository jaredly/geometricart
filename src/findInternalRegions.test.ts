import { segmentsToNonIntersectingSegments } from './findInternalRegions';

describe('ok', () => {
    it('should work', () => {
        const result = segmentsToNonIntersectingSegments([
            { type: 'Line', to: { x: 1, y: 0 } },
            { type: 'Line', to: { x: 0, y: 1 } },
            { type: 'Line', to: { x: 1, y: 1 } },
            { type: 'Line', to: { x: 0, y: 0 } },
        ]);
        // whyyyy are the x zeroes negative? ???
        expect(result).toEqual({
            result: [
                { type: 'Line', to: { x: 1, y: 0 } },
                { type: 'Line', to: { x: 0.5, y: 0.5 } },
                { type: 'Line', to: { x: 0, y: 1 } },
                { type: 'Line', to: { x: 1, y: 1 } },
                { type: 'Line', to: { x: 0.5, y: 0.5 } },
                { type: 'Line', to: { x: 0, y: 0 } },
            ],
            froms: {
                '0.000,0.000': { coord: { x: 0, y: 0 }, exits: [0] },
                '1.000,0.000': { coord: { x: 1, y: 0 }, exits: [1] },
                '0.500,0.500': { coord: { x: 0.5, y: 0.5 }, exits: [2, 5] },
                '0.000,1.000': { coord: { x: 0, y: 1 }, exits: [3] },
                '1.000,1.000': { coord: { x: 1, y: 1 }, exits: [4] },
            },
        });
    });
});
