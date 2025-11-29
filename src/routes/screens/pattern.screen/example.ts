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
                            // disabled: true,
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
                                    fills: {a: {id: 'a', color: 0, mods: []}},
                                    lines: {
                                        // a: {
                                        //     id: 'a',
                                        //     color: 'black',
                                        //     mods: [],
                                        //     width: 0,
                                        //     zIndex: 10,
                                        // },
                                    },
                                    mods: [],
                                    kind: {type: 'alternating', index: 1},
                                    order: 1,
                                },
                                b: {
                                    id: 'b',
                                    fills: {b: {id: 'b', color: 1, mods: []}},
                                    lines: {
                                        // b: {
                                        //     id: 'b',
                                        //     color: 'black',
                                        //     mods: [],
                                        //     width: 3,
                                        //     zIndex: 10,
                                        // },
                                    },
                                    mods: [],
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
                                    order: 3,
                                    lines: {
                                        // b: {
                                        //     id: 'b',
                                        //     zIndex: 'threeZ',
                                        //     mods: [
                                        //         {
                                        //             type: 'rotate',
                                        //             v: 'twoRotate',
                                        //             origin: 'styleCenter',
                                        //         },
                                        //     ],
                                        // },
                                    },
                                    fills: {
                                        b: {
                                            id: 'b',
                                            zIndex: 'threeZ',
                                            shadow: `threeZ ? {offset: {x:0,y:0},blur:{x:4,y:4},color:[0,0,0]} : null`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 'twoRotate',
                                                    origin: 'styleCenter',
                                                },
                                            ],
                                        },
                                    },
                                },
                                c1: {
                                    id: 'c1',
                                    kind: {
                                        type: 'distance',
                                        corner: 2,
                                        repeat: true,
                                        distances: [0, 0.1],
                                    },
                                    mods: [],
                                    lines: {
                                        // b: {
                                        //     id: 'b',
                                        //     zIndex: 'threeZ',
                                        //     mods: [
                                        //         {
                                        //             type: 'rotate',
                                        //             v: '-twoRotate',
                                        //             origin: 'styleCenter',
                                        //         },
                                        //     ],
                                        // },
                                    },
                                    order: 7,
                                    fills: {
                                        b: {
                                            id: 'b',
                                            // color: {r: 255, g: 255, b: 0},
                                            // opacity: 1,
                                            zIndex: 'threeZ',
                                            shadow: `threeZ ? {offset: {x:0,y:0},blur:{x:4,y:4},color:[0,0,0]} : null`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    // v: '-t1 * Math.PI / 3 * 2',
                                                    v: '-twoRotate',
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
                                    lines: {
                                        // a: {
                                        //     id: 'a',
                                        //     zIndex: 'oneZ',
                                        //     width: 'oneZ',
                                        //     mods: [
                                        //         {
                                        //             type: 'rotate',
                                        //             v: 'oneRotate',
                                        //             origin: 'styleCenter',
                                        //         },
                                        //     ],
                                        // },
                                    },
                                    order: 4,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            zIndex: 'oneZ',
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 'oneRotate',
                                                    origin: 'styleCenter',
                                                },
                                            ],
                                            shadow: `oneZ ? {offset: {x:0,y:0},blur:{x:4,y:4},color:[0,0,0]} : null`,
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
                                    lines: {
                                        // a: {
                                        //     id: 'a',
                                        //     zIndex: 'twoZ',
                                        //     width: 'twoZ',
                                        //     mods: [
                                        //         {
                                        //             type: 'rotate',
                                        //             v: '-threeRotate',
                                        //             origin: 'styleCenter',
                                        //         },
                                        //     ],
                                        // },
                                    },
                                    order: 5,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: {r: 0, g: 255, b: 0},
                                            zIndex: 'twoZ',
                                            shadow: `twoZ ? {offset: {x:0,y:0},blur:{x:4,y:4},color:[0,0,0]} : null`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: '-threeRotate',
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
                                    lines: {
                                        // a: {
                                        //     id: 'a',
                                        //     // color: {r: 255, g: 0, b: 0},
                                        //     zIndex: 'twoZ',
                                        //     width: 'twoZ',
                                        //     mods: [
                                        //         {
                                        //             type: 'rotate',
                                        //             v: 'fourRotate',
                                        //             origin: 'styleCenter',
                                        //         },
                                        //     ],
                                        // },
                                    },
                                    order: 5,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: {r: 255, g: 0, b: 0},
                                            zIndex: 'twoZ',
                                            shadow: `twoZ ? {offset: {x:0,y:0},blur:{x:4,y:4},color:[0,0,0]} : null`,
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
                        psize: {x: 4, y: 8},
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
                ts: [4, 4, 4],
                lanes: [
                    {
                        name: 'oneRotate',
                        ys: [0, (Math.PI / 3) * 2],
                        easings: ['inout', 'start'],
                        values: [0, 1, 0, 0],
                    },
                    {
                        name: 'bgColor',
                        ys: [1, 0],
                        easings: [null, null, 'start', null],
                        values: [0, 0, 0, 1],
                    },
                    {
                        name: 'twoRotate',
                        ys: [0, (Math.PI / 3) * 2],
                        easings: [null, null, 'inout', 'start'],
                        values: [0, 0, 0, 1],
                    },
                    {
                        name: 'oneZ',
                        ys: [0, 5],
                        easings: [null, 'start'],
                        values: [1, 1, 0, 0],
                    },
                    {
                        name: 'twoZ',
                        ys: [0, 5],
                        easings: [null, 'start', 'start'],
                        values: [0, 0, 1, 0],
                    },
                    {
                        name: 'threeZ',
                        ys: [0, 5],
                        easings: [null, null, 'start', 'start'],
                        values: [0, 0, 0, 1],
                    },
                    {
                        name: 'threeRotate',
                        ys: [0, Math.PI],
                        easings: [null, 'inout', 'start'],
                        values: [0, 0, 1, 0],
                    },
                    {
                        name: 'fourRotate',
                        ys: [0, (Math.PI / 3) * 2],
                        easings: [null, 'inout', 'start'],
                        values: [0, 0, 1, 0],
                    },
                ],
            },
        },
    };
    return m;
};
