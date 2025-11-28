import {State} from './export-types';

export const example: (id: string) => State = (id: string) => ({
    layers: {
        a: {
            id: 'a',
            shared: {t1: `tsplit(t, 4, .05)`, t2: `Math.sin(t1)`},
            entities: {
                r: {type: 'Group', entities: {p: 1, b: 0}, id: 'r'},
                b: {
                    type: 'Object',
                    id: 'b',
                    style: {
                        id: 'sid',
                        fills: {
                            a: {
                                id: 'a',
                                color: `t < 0.5 ? {h: 190, s: 100, l: 20} : {h: 180, s: 100, l: 40}`,
                                mods: [],
                                zIndex: -4,
                            },
                        },
                        kind: {type: 'everything'},
                        lines: {},
                        mods: [],
                        order: 0,
                    },
                    segments: [
                        {type: 'Arc', center: {x: 0, y: 0}, to: {x: 3, y: 0}, clockwise: true},
                        {type: 'Arc', center: {x: 0, y: 0}, to: {x: 0, y: 3}, clockwise: true},
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
                                fills: {
                                    a: {
                                        id: 'a',
                                        color: {h: 180, s: 100, l: 50},
                                        mods: [
                                            {type: 'crop', id: 'crop2', mode: 'rough'},
                                            {
                                                type: 'inset',
                                                v: 'Math.sin(t1 * Math.PI * 2) * 10',
                                            },
                                            {
                                                type: 'rotate',
                                                v: 't1 * Math.PI / 3 * 2',
                                                origin: {x: 0, y: 0},
                                            },
                                            {type: 'crop', id: 'crop1'},
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
                                        color: {h: 190, s: 100, l: 30},
                                        mods: [
                                            {type: 'crop', id: 'crop2', mode: 'rough'},
                                            {
                                                type: 'rotate',
                                                v: '-t1 * Math.PI / 3 * 2',
                                                origin: {x: 0, y: 0},
                                            },
                                            {
                                                type: 'inset',
                                                v: 'Math.sin(t1 * Math.PI * 2) * -10',
                                            },
                                            {type: 'crop', id: 'crop1'},
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
        clocks: [],
        palette: [],
        timeline: {
            lanes: [],
            ts: [],
        },
    },
});
