import {State} from './export-types';

export const example3: State = {
    shapes: {},
    layers: {
        a: {
            id: 'a',
            shared: {
                t1: 'tsplit(t, 4, .05)',
                t2: 'Math.sin(t1)',
                off: 'return (center) => (1 - dist(center,{x:0,y:0}))/30',
                off2: 'return (center) => (1 - dist(center,{x:0,y:0}))/30 + .02',
                shadow: 'return (n) => ({offset: {x:n*4,y:n*4},blur:{x:n * 2.5,y:n * 2.5},color:[0,0,0]})',
                shadow2:
                    'return (n) => ({offset: {x:n * 4,y:n * 4},blur:{x:n * 2.5,y:n * 2.5},color:[0,0,0]})',
                tCurve: '(t) => {\n                        if (t < .1) return t * 10\n                        if (t > .9) return 1 - (t - .9) * 10\n                        return 1\n                    }',
                sCurve: '\n                        const t1 = t * 6 % 1;\n                        if (t1 < .1) return t1 * 10\n                        if (t1 > .9) return 1 - (t1 - .9) * 10\n                        return 1\n                    ',
                insett: '1',
                bgColor: 't < 5/6 ? 0 : 1',
            },
            entities: {
                r: {type: 'Group', entities: {p: 1}, id: 'r'},
                b: {
                    type: 'Object',
                    id: 'b',
                    style: {
                        id: 'sid',
                        fills: {a: {id: 'a', color: 'bgColor', mods: [], zIndex: -10}},
                        kind: {type: 'everything'},
                        lines: {},
                        mods: [],
                        order: 0,
                    },
                    shape: 'shapea',
                },
                p: {
                    type: 'Pattern',
                    id: 'p',
                    tiling: '8c1427725d69d25b1b37d240d46e61e3266ca947',
                    adjustments: {},
                    contents: {
                        type: 'shapes',
                        styles: {
                            ev: {
                                id: 'ev',
                                disabled: true,
                                fills: {
                                    a: {
                                        enabled: false,
                                        id: 'a',
                                        color: {r: 100, g: 100, b: 100},
                                        mods: [],
                                    },
                                },
                                lines: {},
                                mods: [],
                                kind: {type: 'everything'},
                                order: 0,
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
                            c: {
                                id: 'c',
                                kind: {
                                    type: 'distance',
                                    corner: 0,
                                    repeat: true,
                                    distances: [0, 0.8],
                                },
                                mods: [],
                                order: 3,
                                lines: {},
                                t: {chunk: 2, total: 3, ease: 'inout'},
                                fills: {
                                    b: {
                                        id: 'b',
                                        zIndex: 1,
                                        shadow: 'shadow2(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: 't * Math.PI /4',
                                                origin: 'styleCenter',
                                            },
                                            {
                                                type: 'translate',
                                                v: '({x: -tCurve(t) * 4, y: -tCurve(t) * 4})',
                                            },
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
                                    distances: [0, 0.6],
                                },
                                t: {chunk: 2, total: 3, ease: 'inout'},
                                mods: [],
                                lines: {},
                                order: 4,
                                fills: {
                                    b: {
                                        id: 'b',
                                        zIndex: 1,
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: '-t * Math.PI /2',
                                                origin: 'styleCenter',
                                            },
                                            {
                                                type: 'translate',
                                                v: '({x: -tCurve(t) * 4, y: -tCurve(t) * 4})',
                                            },
                                        ],
                                        shadow: 'shadow2(tCurve(t))',
                                    },
                                },
                            },
                            d1: {
                                id: 'd1',
                                kind: {
                                    type: 'distance',
                                    corner: 1,
                                    repeat: true,
                                    distances: [0, 0.1],
                                },
                                t: {chunk: 2, total: 3, ease: 'inout'},
                                mods: [],
                                lines: {},
                                order: 4,
                                fills: {
                                    b: {
                                        id: 'b',
                                        zIndex: 1,
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: '-t * Math.PI /2',
                                                origin: 'styleCenter',
                                            },
                                            {
                                                type: 'translate',
                                                v: '({x: -tCurve(t) * 4, y: -tCurve(t) * 4})',
                                            },
                                        ],
                                        shadow: 'shadow2(tCurve(t))',
                                    },
                                },
                            },
                            e: {
                                id: 'e',
                                kind: {
                                    type: 'distance',
                                    corner: 1,
                                    repeat: true,
                                    distances: [0, 0.3],
                                },
                                t: {chunk: 1, total: 3, ease: 'inout'},
                                mods: [],
                                lines: {},
                                order: 5,
                                fills: {
                                    a: {
                                        id: 'a',
                                        zIndex: 1,
                                        shadow: 'shadow(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: '-t * Math.PI/2',
                                                origin: 'styleCenter',
                                            },
                                        ],
                                    },
                                },
                                disabled: false,
                            },
                            v1: {
                                id: 'e1',
                                kind: {
                                    type: 'distance',
                                    corner: 0,
                                    repeat: true,
                                    distances: [0, 0, 0.6, 0.8],
                                },
                                mods: [],
                                lines: {},
                                order: 18,
                                t: {chunk: 3, total: 3, ease: 'inout'},
                                fills: {
                                    a: {
                                        id: 'a',
                                        zIndex: 1,
                                        shadow: 'shadow(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: 't * Math.PI/4',
                                                origin: 'styleCenter',
                                            },
                                        ],
                                    },
                                    b: {
                                        id: 'b',
                                        zIndex: 1,
                                        shadow: 'shadow(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: 't * Math.PI/4',
                                                origin: 'styleCenter',
                                            },
                                        ],
                                    },
                                },
                            },
                            e1: {
                                id: 'e1',
                                kind: {
                                    type: 'distance',
                                    corner: 0,
                                    repeat: true,
                                    distances: [0, 0.6],
                                },
                                t: {chunk: 1, total: 3, ease: 'inout'},
                                mods: [],
                                lines: {},
                                order: 7,
                                fills: {
                                    a: {
                                        id: 'a',
                                        zIndex: 1,
                                        shadow: 'shadow(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: 't * Math.PI/2',
                                                origin: 'styleCenter',
                                            },
                                        ],
                                    },
                                },
                            },
                            e2: {
                                id: 'e2',
                                kind: {
                                    type: 'distance',
                                    corner: 2,
                                    repeat: true,
                                    distances: [0, 0.7],
                                },
                                mods: [],
                                lines: {},
                                order: 8,
                                t: {chunk: 1, total: 3, ease: 'inout'},
                                fills: {
                                    a: {
                                        id: 'a',
                                        zIndex: 1,
                                        shadow: 'shadow(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: 't * Math.PI /2',
                                                origin: 'styleCenter',
                                            },
                                        ],
                                    },
                                },
                                disabled: false,
                            },
                            'style-10': {
                                id: 'style-10',
                                order: 28,
                                kind: {
                                    type: 'distance',
                                    corner: 2,
                                    distances: [0, 0.3],
                                    repeat: true,
                                },
                                fills: {
                                    b: {
                                        id: 'b',
                                        zIndex: 1,
                                        shadow: 'shadow(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: '-t * Math.PI/4',
                                                origin: 'styleCenter',
                                            },
                                        ],
                                    },
                                    a: {
                                        id: 'a',
                                        zIndex: 1,
                                        shadow: 'shadow(tCurve(t))',
                                        mods: [
                                            {
                                                type: 'rotate',
                                                v: '-t * Math.PI/4',
                                                origin: 'styleCenter',
                                            },
                                        ],
                                    },
                                },
                                lines: {},
                                mods: [],
                                t: {chunk: 3, total: 3, ease: 'inout'},
                                disabled: false,
                            },
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
    view: {ppi: 1, box: {x: -2.5, y: -2.5, width: 5, height: 5}, background: 'chunk([1,0, 0], t)'},
    styleConfig: {
        seed: 0,
        palette: [
            {r: 212, g: 0, b: 255},
            {r: 127, g: 0, b: 153},
            {r: 249, g: 158, b: 255},
        ],
        timeline: {ts: [], lanes: []},
    },
};
