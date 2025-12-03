import {State} from './export-types';

export const example: (id: string) => State = (id: string) => {
    const m: State = {
        shapes: {
            hex: {
                origin: {x: -0.333333324359218, y: -0.5773502640084173},
                segments: [
                    {type: 'Line', to: {x: 0.333333324359218, y: -0.5773502640084173}},
                    {type: 'Line', to: {x: 0.6666666576925508, y: -5.181207685112099e-9}},
                    {type: 'Line', to: {x: 0.333333324359218, y: 0.5773502640084173}},
                    {type: 'Line', to: {x: -0.333333324359218, y: 0.5773502640084173}},
                    {type: 'Line', to: {x: -0.6666666576925508, y: -5.181207685112099e-9}},
                ],
                open: false,
            },
            vtjgy8lpyg: {
                origin: {x: 0.16666666517098078, y: -0.0962250457284722},
                segments: [
                    {type: 'Line', to: {x: 0.9999999932634218, y: 0.38490017557038503}},
                    {type: 'Line', to: {x: 1.8333333348290184, y: -0.0962250457284722}},
                    {type: 'Line', to: {x: 1.833333333333332, y: -1.0584754857355834}},
                    {type: 'Line', to: {x: 1.0000000014956856, y: -1.5396007187025607}},
                    {type: 'Line', to: {x: 0.16666666666666702, y: -1.0584754857355834}},
                ],
                open: false,
            },
            qcjm4l0c54n: {
                origin: {x: 0.16666666666666702, y: 1.0584754857355834},
                segments: [
                    {type: 'Line', to: {x: 0.9999999947591081, y: 1.5396007070344404}},
                    {type: 'Line', to: {x: 1.8333333363247046, y: 1.0584754857355834}},
                    {type: 'Line', to: {x: 1.8333333348290182, y: 0.09622504572847213}},
                    {type: 'Line', to: {x: 1.0000000029913718, y: -0.38490018723850516}},
                    {type: 'Line', to: {x: 0.16666666816235326, y: 0.09622504572847213}},
                ],
            },
            xksjgxn36m: {
                origin: {x: -0.833333333333333, y: 1.6358257644310328},
                segments: [
                    {type: 'Line', to: {x: -5.240891942648318e-9, y: 2.11695098572989}},
                    {type: 'Line', to: {x: 0.8333333363247046, y: 1.6358257644310328}},
                    {type: 'Line', to: {x: 0.8333333348290182, y: 0.6735753244239215}},
                    {type: 'Line', to: {x: 2.991371816918331e-9, y: 0.19245009145694425}},
                    {type: 'Line', to: {x: -0.8333333318376468, y: 0.6735753244239215}},
                ],
            },
            dec99c0166t: {
                origin: {x: -1.833333333333332, y: 1.0584754857355834},
                segments: [
                    {type: 'Line', to: {x: -1.0000000052408908, y: 1.5396007070344404}},
                    {type: 'Line', to: {x: -0.16666666367529426, y: 1.0584754857355834}},
                    {type: 'Line', to: {x: -0.16666666517098072, y: 0.09622504572847213}},
                    {type: 'Line', to: {x: -0.9999999970086271, y: -0.38490018723850516}},
                    {type: 'Line', to: {x: -1.8333333318376457, y: 0.09622504572847213}},
                ],
            },
            qwf9s90l0g: {
                origin: {x: -1.8333333348290184, y: -0.0962250457284722},
                segments: [
                    {type: 'Line', to: {x: -1.0000000067365773, y: 0.38490017557038503}},
                    {type: 'Line', to: {x: -0.16666666517098072, y: -0.0962250457284722}},
                    {type: 'Line', to: {x: -0.16666666666666718, y: -1.0584754857355834}},
                    {type: 'Line', to: {x: -0.9999999985043135, y: -1.5396007187025607}},
                    {type: 'Line', to: {x: -1.8333333333333321, y: -1.0584754857355834}},
                ],
            },
            '5a5jphhuob': {
                origin: {x: -0.8333333265967551, y: -0.6735753101651982},
                segments: [
                    {type: 'Line', to: {x: 1.495686019481468e-9, y: -0.19245008886634096}},
                    {type: 'Line', to: {x: 0.8333333430612826, y: -0.6735753101651982}},
                    {type: 'Line', to: {x: 0.8333333415655961, y: -1.6358257501723092}},
                    {type: 'Line', to: {x: 9.727949779048117e-9, y: -2.1169509831392865}},
                    {type: 'Line', to: {x: -0.8333333251010688, y: -1.6358257501723092}},
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
                    shadow: 'return (n) => ({offset: {x:0,y:0},blur:{x:n * 25,y:n * 25},color:[0,0,0]})',
                    sCurve: `
                        const t1 = t * 3 % 1;
                        if (t1 < .1) return t1 * 10
                        if (t1 > .9) return 1 - (t1 - .9) * 10
                        return 1
                    `,
                    insett: '1',
                },
                entities: {
                    r: {type: 'Group', entities: {p: 1}, id: 'r'},
                    b: {
                        type: 'Object',
                        id: 'b',
                        style: {
                            // disabled: true,
                            id: 'sid',
                            fills: {
                                a: {id: 'a', color: `bgColor`, mods: [], zIndex: -10},
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
                        adjustments: {
                            // hex: [{type: 'rotate', v: 'Math.PI * t'}],
                            vtjgy8lpyg: [{type: 'rotate', v: 'Math.PI * t', origin: 'center'}],
                            // qcjm4l0c54n: [{type: 'rotate', v: 'Math.PI * t'}],
                            xksjgxn36m: [{type: 'rotate', v: 'Math.PI * t', origin: 'center'}],
                            // dec99c0166t: [{type: 'rotate', v: 'Math.PI * t'}],
                            qwf9s90l0g: [{type: 'rotate', v: 'Math.PI * t', origin: 'center'}],
                            // '5a5jphhuob': [{type: 'rotate', v: 'Math.PI * t'}],
                        },
                        contents: {
                            type: 'shapes',
                            styles: {
                                ev: {
                                    id: 'ev',
                                    fills: {
                                        a: {
                                            id: 'a',
                                            // color: `return {h: dist(center, {x:0,y:0}) * 100, s: 100, l: Math.abs(angleTo(center,{x:0,y:0})) * 20}`,
                                            color: {r: 100, g: 100, b: 100},
                                            mods: [{type: 'inset', v: 5}],
                                            // mods: [],
                                        },
                                    },
                                    lines: {
                                        // a: {
                                        //     id: 'a',
                                        //     color: {r: 10, g: 10, b: 10},
                                        //     width: 2,
                                        //     mods: [],
                                        // },
                                    },
                                    mods: [],
                                    kind: {type: 'everything'},
                                    order: 1,
                                },
                                a: {
                                    id: 'a',
                                    fills: {a: {id: 'a', color: 0, mods: []}},
                                    lines: {},
                                    mods: [],
                                    kind: {type: 'alternating', index: 1},
                                    order: 1,
                                },
                                b: {
                                    id: 'b',
                                    fills: {b: {id: 'b', color: 1, mods: []}},
                                    lines: {},
                                    mods: [],
                                    kind: {type: 'alternating', index: 0},
                                    order: 2,
                                },
                                // c: {
                                //     id: 'c',
                                //     kind: {
                                //         type: 'distance',
                                //         corner: 0,
                                //         repeat: true,
                                //         distances: [0, 0.6],
                                //     },
                                //     mods: [],
                                //     order: 3,
                                //     lines: {},
                                //     fills: {
                                //         b: {
                                //             id: 'b',
                                //             zIndex: 'threeZ',
                                //             enabled: '!!threeZ',
                                //             shadow: `shadow(sCurve)`,
                                //             mods: [
                                //                 {
                                //                     type: 'rotate',
                                //                     v: 'twoRotate',
                                //                     origin: 'styleCenter',
                                //                 },
                                //             ],
                                //         },
                                //     },
                                // },
                                // c1: {
                                //     id: 'c1',
                                //     kind: {
                                //         type: 'distance',
                                //         corner: 2,
                                //         repeat: true,
                                //         distances: [0, 0.1],
                                //     },
                                //     mods: [],
                                //     lines: {
                                //         // b: {
                                //         //     id: 'b',
                                //         //     zIndex: 'threeZ',
                                //         //     mods: [
                                //         //         {
                                //         //             type: 'rotate',
                                //         //             v: '-twoRotate',
                                //         //             origin: 'styleCenter',
                                //         //         },
                                //         //     ],
                                //         // },
                                //     },
                                //     order: 7,
                                //     fills: {
                                //         b: {
                                //             id: 'b',
                                //             // color: {r: 255, g: 255, b: 0},
                                //             // opacity: 1,
                                //             zIndex: 'threeZ',
                                //             enabled: '!!threeZ',
                                //             shadow: `shadow(sCurve)`,
                                //             mods: [
                                //                 {
                                //                     type: 'rotate',
                                //                     // v: '-t1 * Math.PI / 3 * 2',
                                //                     v: '-twoRotate',
                                //                     origin: 'styleCenter',
                                //                 },
                                //                 // {type: 'inset', v: 5},
                                //             ],
                                //         },
                                //     },
                                // },
                                // d: {
                                //     id: 'd',
                                //     kind: {
                                //         type: 'distance',
                                //         corner: 2,
                                //         repeat: true,
                                //         distances: [0, 0.5],
                                //         // distances: [0, 1.0],
                                //     },
                                //     mods: [],
                                //     lines: {
                                //         // a: {
                                //         //     id: 'a',
                                //         //     zIndex: 'oneZ',
                                //         //     width: 'oneZ',
                                //         //     mods: [
                                //         //         {
                                //         //             type: 'rotate',
                                //         //             v: 'oneRotate',
                                //         //             origin: 'styleCenter',
                                //         //         },
                                //         //     ],
                                //         // },
                                //     },
                                //     order: 4,
                                //     fills: {
                                //         a: {
                                //             id: 'a',
                                //             zIndex: 'oneZ',
                                //             enabled: '!!oneZ',
                                //             mods: [
                                //                 {
                                //                     type: 'rotate',
                                //                     v: 'oneRotate',
                                //                     origin: 'styleCenter',
                                //                 },
                                //             ],
                                //             shadow: `shadow(sCurve)`,
                                //         },
                                //     },
                                // },
                                // e: {
                                //     id: 'e',
                                //     kind: {
                                //         type: 'distance',
                                //         corner: 1,
                                //         repeat: true,
                                //         distances: [0, 0.2],
                                //         // distances: [0, 1.0],
                                //     },
                                //     mods: [],
                                //     lines: {
                                //         // a: {
                                //         //     id: 'a',
                                //         //     zIndex: 'twoZ',
                                //         //     width: 'twoZ',
                                //         //     mods: [
                                //         //         {
                                //         //             type: 'rotate',
                                //         //             v: '-threeRotate',
                                //         //             origin: 'styleCenter',
                                //         //         },
                                //         //     ],
                                //         // },
                                //     },
                                //     order: 5,
                                //     fills: {
                                //         a: {
                                //             id: 'a',
                                //             // color: {r: 0, g: 255, b: 0},
                                //             zIndex: 'twoZ',
                                //             enabled: '!!twoZ',
                                //             shadow: `shadow(sCurve)`,
                                //             mods: [
                                //                 {
                                //                     type: 'rotate',
                                //                     v: '-threeRotate',
                                //                     origin: 'styleCenter',
                                //                 },
                                //             ],
                                //         },
                                //     },
                                // },
                                // f: {
                                //     id: 'f',
                                //     kind: {
                                //         type: 'distance',
                                //         corner: 0,
                                //         repeat: true,
                                //         distances: [0, 0.1],
                                //         // distances: [0, 1.0],
                                //     },
                                //     mods: [],
                                //     lines: {
                                //         // a: {
                                //         //     id: 'a',
                                //         //     // color: {r: 255, g: 0, b: 0},
                                //         //     zIndex: 'twoZ',
                                //         //     width: 'twoZ',
                                //         //     mods: [
                                //         //         {
                                //         //             type: 'rotate',
                                //         //             v: 'fourRotate',
                                //         //             origin: 'styleCenter',
                                //         //         },
                                //         //     ],
                                //         // },
                                //     },
                                //     order: 5,
                                //     fills: {
                                //         a: {
                                //             id: 'a',
                                //             // color: {r: 255, g: 0, b: 0},
                                //             enabled: '!!twoZ',
                                //             zIndex: 'twoZ',
                                //             shadow: `shadow(sCurve)`,
                                //             mods: [
                                //                 {
                                //                     type: 'rotate',
                                //                     v: 'fourRotate',
                                //                     origin: 'styleCenter',
                                //                 },
                                //             ],
                                //         },
                                //     },
                                // },
                            },
                        },
                        mods: [],
                        psize: {x: 4, y: 6},
                    },
                },
                guides: [],
                opacity: 1,
                order: 1,
                rootGroup: 'r',
            },
        },
        crops: {},
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
