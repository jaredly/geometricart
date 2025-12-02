import {State} from './export-types';

export const example: (id: string) => State = (id: string): State => ({
    shapes: {
        shapea: {
            origin: {x: 0, y: 3},
            segments: [
                {type: 'Arc', center: {x: 0, y: 0}, to: {x: 3, y: 0}, clockwise: true},
                {type: 'Arc', center: {x: 0, y: 0}, to: {x: 0, y: 3}, clockwise: true},
            ],
        },
    },
    layers: {
        a: {
            id: 'a',
            shared: {
                t1: `tsplit(t, 4, .05)`,
                t2: `Math.sin(t1)`,
                off: 'return (center) => (1 - dist(center,{x:0,y:0}))/30',
                off2: 'return (center) => (1 - dist(center,{x:0,y:0}))/30 + .02',
                insett: '5',
            },
            entities: {
                r: {type: 'Group', entities: {p: 1}, id: 'r'},
                b: {
                    type: 'Object',
                    id: 'b',
                    style: {
                        id: 'sid',
                        fills: {
                            a: {
                                // color: {h: 80, s: 100, l: 50},
                                id: 'a',
                                // width: 3,
                                // color: `t < 0.5 ? {h: 190, s: 100, l: 30} : {h: 180, s: 100, l: 50}`,
                                color: `t < 0.5 ? {h: 190, s: 100, l: 20} : {h: 180, s: 100, l: 40}`,
                                mods: [],
                                zIndex: -10,
                            },
                        },
                        kind: {type: 'everything'},
                        lines: {},
                        mods: [],
                        order: 0,
                    },
                    shape: 'shapea',
                },
                p: {
                    type: 'Pattern',
                    id,
                    contents: {
                        type: 'shapes',
                        styles: {
                            a: {
                                id: 'a',
                                fills: {
                                    a: {
                                        id: 'a',
                                        color: {h: 180, s: 100, l: 50},
                                        // width: 2,
                                        opacity: 'oneOpacity_fn(t + off(center))',
                                        mods: [
                                            // {type: 'crop', id: 'crop2', mode: 'rough'},
                                            {
                                                type: 'inset',
                                                v: 'oneInset_fn(t + off(center)) * insett',
                                                // v: 'Math.sin(t1 * Math.PI * 2) * 10',
                                            },
                                            {
                                                type: 'rotate',
                                                // v: 't1 * Math.PI / 3 * 2',
                                                v: 'oneRotate_fn(t + off(center)/2)',
                                                origin: {x: 0, y: 0},
                                            },
                                            // {type: 'crop', id: 'crop1'},
                                        ],
                                        zIndex: 't < 0.5 ? 1 : -1',
                                    },
                                },
                                lines: {},
                                mods: [],
                                kind: {type: 'everything'},
                                order: 1,
                            },
                            b: {
                                id: 'b',
                                fills: {
                                    a: {
                                        id: 'a',
                                        // color: {h: 190, s: 100, l: 50},
                                        color: {h: 180, s: 100, l: 50},
                                        // width: 2,
                                        opacity: 'twoOpacity_fn(t + off2(center))',
                                        mods: [
                                            // {type: 'crop', id: 'crop2', mode: 'rough'},
                                            {
                                                type: 'rotate',
                                                // v: '-t1 * Math.PI / 3 * 2',
                                                v: 'twoRotate_fn(t + off(center)/2)',
                                                origin: {x: 0, y: 0},
                                            },
                                            {
                                                type: 'inset',
                                                // v: 'Math.sin(t1 * Math.PI * 2) * -10',
                                                v: 'twoInset_fn(t + off2(center)) * insett',
                                            },
                                            // {type: 'crop', id: 'crop1'},
                                        ],
                                        zIndex: 't > 0.5 ? 1 : -1',
                                    },
                                },
                                mods: [],
                                // lines: {c: {id: 'c', color: '#0f0', width: 2}},
                                lines: {},
                                kind: {type: 'alternating', index: 0},
                                order: 2,
                            },
                        },
                    },
                    mods: [],
                    psize: 4,
                },
            },
            guides: [],
            opacity: 1,
            order: 1,
            rootGroup: 'r',
        },
    },
    crops: {
        //     crop1: {
        //         id: 'crop1',
        //         shape: [
        //             {type: 'Arc', center: {x: 0, y: 0}, to: {x: -3, y: 0}, clockwise: false},
        //             {type: 'Arc', center: {x: 0, y: 0}, to: {x: 0, y: -3}, clockwise: false},
        //         ],
        //     },
        //     crop2: {
        //         id: 'crop2',
        //         shape: [
        //             {type: 'Arc', center: {x: 0, y: 0}, to: {x: 3.2, y: 0}, clockwise: true},
        //             {type: 'Arc', center: {x: 0, y: 0}, to: {x: 0, y: 3.2}, clockwise: true},
        //         ],
        //     },
    },
    view: {ppi: 1, box: {x: -0.5, y: -0.5, width: 1, height: 2}},
    styleConfig: {
        seed: 0,
        // clocks: [],
        palette: [],
        timeline: {
            ts: [1, 4, 1, 4, 1, 1, 1],
            lanes: [
                {
                    name: 'oneInset',
                    ys: [0, 1],
                    easings: ['inout', null, 'inout', null, null, null, null],
                    values: [0, 1, 1, 0, 0, 0, 0, 0],
                },
                {
                    name: 'oneRotate',
                    ys: [0, Math.PI / 3],
                    easings: [null, 'inout'],
                    values: [0, 0, 1, 1, 1, 1, 1],
                },
                {
                    name: 'oneOpacity',
                    ys: [0.2, 1],
                    easings: [null, null, 'inout', null, 'inout'],
                    values: [1, 1, 1, 0, 0, 1, 1],
                },
                {
                    name: 'twoInset',
                    ys: [0, 1],
                    easings: [null, null, 'inout', null, 'inout'],
                    values: [0, 0, 0, 1, 1, 0, 0],
                },
                {
                    name: 'twoRotate',
                    ys: [0, Math.PI / 3],
                    easings: [null, null, null, 'inout'],
                    values: [0, 0, 0, 0, 1, 1, 1],
                },
                {
                    name: 'twoOpacity',
                    ys: [0.2, 1],
                    easings: [null, null, 'inout', null, 'inout'],
                    values: [0, 0, 0, 1, 1, 0, 0],
                },
            ],
        },
    },
});
