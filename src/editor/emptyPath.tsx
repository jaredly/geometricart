import {Path} from '../types';

export const emptyPath: Path = {
    created: 0,
    group: null,
    hidden: false,
    open: false,
    id: '',
    ordering: 0,
    style: {
        lines: [],
        fills: [],
    },
    clipMode: 'normal',
    segments: [],
    origin: {x: 0, y: 0},
};
