import {Path, Segment} from '../types';

export const pathSegs = (segments: Array<Segment>): Path => ({
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

    segments,
    origin: segments[segments.length - 1].to,
});