import {State} from './export-types';

export const example: (id: string) => State = (id: string) => {
    const m: State = {
        layers: {
            a: {
                id: 'a',
                shared: {
                    t1: `tsplit(t, 4, .05)`,
                    t2: `Math.sin(t1)`,
                    off: 'return (center) => (1 - dist(center,{x:0,y:0}))/30',
                    off2: 'return (center) => (1 - dist(center,{x:0,y:0}))/30 + .02',
                    insett: '1',
                },
                entities: {
                    r: {type: 'Group', entities: {p: 1, b: 0}, id: 'r'},
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
                                    color: `bgColor`,
                                    mods: [],
                                    zIndex: -10,
                                },
                            },
                            kind: {type: 'everything'},
                            lines: {},
                            mods: [],
                            order: 0,
                        },
                        segments: [
                            {type: 'Arc', center: {x: 0, y: 0}, to: {x: 5, y: 0}, clockwise: true},
                            {type: 'Arc', center: {x: 0, y: 0}, to: {x: 0, y: 5}, clockwise: true},
                        ],
                    },
                    p: {
                        type: 'Pattern',
                        id,
                        contents: {
                            type: 'shapes',
                            styles: {
                                a: {
                                    id: 'a',
                                    // disabled: true,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            color: 0,
                                            // width: 2,
                                            // opacity: 'oneOpacity_fn(t + off(center))',
                                            mods: [
                                                // {type: 'crop', id: 'crop2', mode: 'rough'},
                                                {
                                                    type: 'inset',
                                                    v: 'oneInset * insett',
                                                    // v: 'Math.sin(t1 * Math.PI * 2) * 10',
                                                },
                                                // {
                                                //     type: 'rotate',
                                                //     // v: 't1 * Math.PI / 3 * 2',
                                                //     v: 'oneRotate_fn(t + off(center)/2)',
                                                //     origin: {x: 0, y: 0},
                                                // },
                                                // {type: 'crop', id: 'crop1'},
                                            ],
                                            // mods: [],
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
                                    // disabled: true,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: {h: 190, s: 100, l: 50},
                                            color: 1,
                                            // width: 2,
                                            // opacity: 'twoOpacity_fn(t + off2(center))',
                                            mods: [
                                                // {type: 'crop', id: 'crop2', mode: 'rough'},
                                                // {
                                                //     type: 'rotate',
                                                //     // v: '-t1 * Math.PI / 3 * 2',
                                                //     v: 'twoRotate_fn(t + off(center)/2)',
                                                //     origin: {x: 0, y: 0},
                                                // },
                                                {
                                                    type: 'inset',
                                                    // v: 'Math.sin(t1 * Math.PI * 2) * -10',
                                                    v: 'twoInset * insett',
                                                },
                                                // {type: 'crop', id: 'crop1'},
                                            ],
                                            // mods: [],
                                            zIndex: 't > 0.5 ? 1 : -1',
                                        },
                                    },
                                    mods: [],
                                    // lines: {c: {id: 'c', color: '#0f0', width: 2}},
                                    lines: {},
                                    kind: {type: 'alternating', index: 0},
                                    order: 2,
                                },
                                c: {
                                    id: 'c',
                                    kind: {
                                        type: 'distance',
                                        corner: 0,
                                        repeat: true,
                                        distances: [0, 0.6],
                                    },
                                    mods: [],
                                    lines: {},
                                    order: 3,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: {r: 255, g: 255, b: 0},
                                            // opacity: 1,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    // v: '-t1 * Math.PI / 3 * 2',
                                                    v: 'twoRotate',
                                                    origin: 'styleCenter',
                                                },
                                                // {type: 'inset', v: 5},
                                            ],
                                        },
                                    },
                                },
                                d: {
                                    id: 'd',
                                    kind: {
                                        type: 'distance',
                                        corner: 2,
                                        repeat: true,
                                        distances: [0, 0.5],
                                        // distances: [0, 1.0],
                                    },
                                    mods: [],
                                    lines: {},
                                    order: 4,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: {r: 0, g: 255, b: 0},
                                            // opacity: 1,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    // v: '-t1 * Math.PI / 3 * 2',
                                                    v: 'oneRotate',
                                                    origin: 'styleCenter',
                                                },
                                                // {type: 'inset', v: 5},
                                            ],
                                        },
                                    },
                                },
                                e: {
                                    id: 'e',
                                    kind: {
                                        type: 'distance',
                                        corner: 1,
                                        repeat: true,
                                        distances: [0, 0.2],
                                        // distances: [0, 1.0],
                                    },
                                    mods: [],
                                    lines: {},
                                    order: 5,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: {r: 0, g: 255, b: 0},
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 'threeRotate',
                                                    origin: 'styleCenter',
                                                },
                                            ],
                                        },
                                    },
                                },
                                f: {
                                    id: 'f',
                                    kind: {
                                        type: 'distance',
                                        corner: 0,
                                        repeat: true,
                                        distances: [0, 0.7],
                                        // distances: [0, 1.0],
                                    },
                                    mods: [],
                                    lines: {},
                                    order: 5,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: {r: 255, g: 0, b: 0},
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 'fourRotate',
                                                    origin: 'styleCenter',
                                                },
                                            ],
                                        },
                                    },
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
            crop1: {
                id: 'crop1',
                shape: [
                    {type: 'Arc', center: {x: 0, y: 0}, to: {x: -3, y: 0}, clockwise: false},
                    {type: 'Arc', center: {x: 0, y: 0}, to: {x: 0, y: -3}, clockwise: false},
                ],
            },
            crop2: {
                id: 'crop2',
                shape: [
                    {type: 'Arc', center: {x: 0, y: 0}, to: {x: 3.2, y: 0}, clockwise: true},
                    {type: 'Arc', center: {x: 0, y: 0}, to: {x: 0, y: 3.2}, clockwise: true},
                ],
            },
        },
        view: {ppi: 1, box: {x: -0.5, y: -0.5, width: 1, height: 2}},
        styleConfig: {
            seed: 0,
            palette: [
                {h: 180, s: 100, l: 50},
                {h: 190, s: 100, l: 20},
                {h: 180, s: 100, l: 40},
            ],
            timeline: {
                ts: [1, 4, 4, 1, 1, 4, 1, 1, 1],
                lanes: [
                    {
                        name: 'oneInset',
                        ys: [0, 1],
                        easings: ['inout', null, null, 'inout', null, null, null, null],
                        values: [0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
                    },
                    {
                        name: 'oneRotate',
                        ys: [0, (Math.PI / 3) * 2],
                        easings: [null, 'inout', 'start'],
                        values: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
                    },
                    {
                        name: 'twoInset',
                        ys: [0, 1],
                        easings: [null, null, null, null, 'inout', null, 'inout'],
                        values: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
                    },
                    {
                        name: 'bgColor',
                        ys: [1, 0],
                        easings: [null, null, null, null, 'start', null],
                        values: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
                    },
                    {
                        name: 'twoRotate',
                        ys: [0, (Math.PI / 3) * 2],
                        easings: [null, null, null, null, null, 'inout', 'start'],
                        values: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    },
                    {
                        name: 'threeRotate',
                        ys: [0, -Math.PI],
                        easings: [null, null, 'inout', 'start'],
                        values: [0, 0, 0, 1, 0, 0, 0, 0, 0],
                    },
                    {
                        name: 'fourRotate',
                        ys: [0, (Math.PI / 3) * 2],
                        easings: [null, null, 'inout', 'start'],
                        values: [0, 0, 0, 1, 0, 0, 0, 0, 0],
                    },
                ],
            },
        },
    };
    return m;
};
