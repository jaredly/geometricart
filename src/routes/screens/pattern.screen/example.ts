import {parseColor} from './colors';
import {State} from './export-types';

export const example: (id: string) => State = (id: string) => {
    const m: State = {
        shapes: {},
        layers: {
            a: {
                id: 'a',
                shared: {
                    t1: `tsplit(t, 4, .05)`,
                    t2: `Math.sin(t1)`,
                    off: 'return (center) => (1 - dist(center,{x:0,y:0}))/30',
                    off2: 'return (center) => (1 - dist(center,{x:0,y:0}))/30 + .02',
                    shadow: 'return (n) => ({offset: {x:n*4,y:n*4},blur:{x:n * 2.5,y:n * 2.5},color:[0,0,0]})',
                    shadow2:
                        'return (n) => ({offset: {x:n * 4,y:n * 4},blur:{x:n * 2.5,y:n * 2.5},color:[0,0,0]})',
                    tCurve: `(t) => {
                        if (t < .1) return t * 10
                        if (t > .9) return 1 - (t - .9) * 10
                        return 1
                    }`,
                    sCurve: `
                        const t1 = t * 6 % 1;
                        if (t1 < .1) return t1 * 10
                        if (t1 > .9) return 1 - (t1 - .9) * 10
                        return 1
                    `,
                    insett: '1',
                    bgColor: 't < 5/6 ? 0 : 1',
                    // bgColor: 't >= .5 ? "gold" : 1',
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
                        id: 'p',
                        tiling: id,
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
                                    fills: {
                                        a: {
                                            id: 'a',
                                            color: 0,
                                            mods: [],
                                            // mods: [],
                                            // shadow: { blur: 0.5, offset: 1, },
                                        },
                                    },
                                    lines: {},
                                    mods: [],
                                    kind: {type: 'alternating', index: 1},
                                    order: 1,
                                },
                                b: {
                                    id: 'b',
                                    fills: {
                                        b: {
                                            id: 'b',
                                            color: 1,
                                            // mods: [],
                                            mods: [],
                                            // shadow: { blur: 0.5, offset: 1, },
                                        },
                                    },
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
                                        distances: [0, 0.6],
                                    },
                                    mods: [],
                                    order: 3,
                                    lines: {},
                                    t: {chunk: 1, total: 6, ease: 'inout'},
                                    fills: {
                                        b: {
                                            id: 'b',
                                            zIndex: 1,
                                            // enabled: '!!enable1',
                                            shadow: `shadow2(tCurve(t))`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 't * Math.PI * 2 / 3',
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
                                        distances: [0, 0.5],
                                        // distances: [0, 1.0],
                                    },
                                    t: {chunk: 1, total: 6, ease: 'inout'},
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
                                                    v: '-t * Math.PI * 2 / 3',
                                                    origin: 'styleCenter',
                                                },
                                                {
                                                    type: 'translate',
                                                    v: '({x: -tCurve(t) * 4, y: -tCurve(t) * 4})',
                                                },
                                            ],
                                            shadow: `shadow2(tCurve(t))`,
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
                                    t: {chunk: 3, total: 6, ease: 'inout'},
                                    mods: [],
                                    lines: {},
                                    order: 5,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            zIndex: 1,
                                            shadow: `shadow(tCurve(t))`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: '-t * Math.PI',
                                                    origin: 'styleCenter',
                                                },
                                            ],
                                        },
                                    },
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
                                    order: 6,
                                    t: {chunk: 5, total: 6, ease: 'inout'},
                                    fills: {
                                        a: {
                                            id: 'a',
                                            zIndex: 1,
                                            shadow: `shadow(tCurve(t))`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 't * Math.PI/3',
                                                    origin: 'styleCenter',
                                                },
                                            ],
                                        },
                                        b: {
                                            id: 'b',
                                            zIndex: 1,
                                            shadow: `shadow(tCurve(t))`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 't * Math.PI/3',
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
                                    t: {chunk: 3, total: 6, ease: 'inout'},
                                    mods: [],
                                    lines: {},
                                    order: 7,
                                    fills: {
                                        a: {
                                            id: 'a',
                                            zIndex: 1,
                                            shadow: `shadow(tCurve(t))`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 't * Math.PI',
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
                                        distances: [0, 0.1],
                                    },
                                    mods: [],
                                    lines: {},
                                    order: 8,
                                    t: {chunk: 3, total: 6, ease: 'inout'},
                                    fills: {
                                        a: {
                                            id: 'a',
                                            zIndex: 1,
                                            shadow: `shadow(tCurve(t))`,
                                            mods: [
                                                {
                                                    type: 'rotate',
                                                    v: 't * Math.PI',
                                                    origin: 'styleCenter',
                                                },
                                            ],
                                        },
                                    },
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
        view: {
            ppi: 1,
            box: {x: -2.5, y: -2.5, width: 5, height: 5},
            // background: 'bgColor',
            background: 'chunk([0, 0, 1, 0, 0, 0], t)',
        },
        styleConfig: {
            seed: 0,
            palette: [
                parseColor('#d400ff')!,
                parseColor('#7f0099')!,
                parseColor('#f99eff')!,
                // {h: 180, s: 100, l: 50},
                // {h: 190, s: 100, l: 20},
                // {h: 180, s: 100, l: 40},
            ],
            // timeline: makeLanes(6),
            timeline: {ts: [], lanes: []},
        },
    };
    return m;
};

const oldNames = {
    ts: [4, 4, 4],
    lanes: [
        {
            name: 'oneRotate',
            ys: [0, (Math.PI / 3) * 2],
            easings: ['inoutflat', 'start'],
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
            easings: [null, null, 'inoutflat', 'start'],
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
            easings: [null, 'inoutflat', 'start'],
            values: [0, 0, 1, 0],
        },
        {
            name: 'fourRotate',
            ys: [0, (Math.PI / 3) * 2],
            easings: [null, 'inout', 'start'],
            values: [0, 0, 1, 0],
        },
    ],
};

const makeLanes = (count: number): State['styleConfig']['timeline'] => {
    const ts: number[] = Array(count).fill(1);
    const lanes: State['styleConfig']['timeline']['lanes'] = [];
    for (let i = 0; i < count; i++) {
        const values = [0];
        const easings: (string | null)[] = [];
        const envalues = [i === 0 ? 1 : 0];
        const enease: (string | null)[] = [];

        for (let j = 0; j < count; j++) {
            if (j === i) {
                values.push(1);
                easings.push('inoutflat');
                envalues.push(1);
                enease.push('start');
            } else if (j === i + 1) {
                values.push(0);
                easings.push('start');
                envalues.push(0);
                enease.push('start');
            } else {
                values.push(0);
                easings.push(null);
                envalues.push(0);
                enease.push(null);
            }
        }

        lanes.push(
            {
                name: 'ease' + (i + 1),
                ys: [0, 1],
                easings,
                values,
            },
            {
                name: 'enable' + (i + 1),
                ys: [0, 1],
                easings: enease,
                values: envalues,
            },
        );
    }
    return {ts, lanes};
};
