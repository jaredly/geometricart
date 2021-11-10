import { State, History } from './types';

// export const pointForView = (coord: Coord, view: View) => {
// 	return {
// 		x: (coord.x - view.center.x) * view.zoom + view.center.x,
// 		y: (coord.y - view.center.y) * view.zoom + view.center.y
// 	}
// }
// Should I use hashes to persist the realized whatsits for all the things?
// idk let's just do it slow for now.

export const initialHistory: History = {
    nextId: 1,
    undo: 0,
    currentBranch: 0,
    branches: {
        [0]: {
            id: 0,
            items: [],
            snapshot: null,
            parent: null,
        },
    },
};

export const initialState: State = {
    pending: null,
    nextId: 0,
    paths: {},
    history: initialHistory,
    pathGroups: {},
    guides: {
        base: {
            id: 'base',
            geom: {
                type: 'Circle',
                center: { x: 0, y: 0 },
                radius: { x: 0, y: -1 },
                line: true,
                half: true,
                multiples: 5,
            },
            active: true,
            basedOn: [],
            mirror: 'baseMirror',
        },
    },
    mirrors: {
        // second: {
        // 	id: 'second',
        // 	reflect: true,
        // },
        baseMirror: {
            id: 'baseMirror',
            origin: { x: 0, y: 0 },
            parent: null,
            point: { x: 0, y: -1 },
            reflect: true,
            rotational: [true, true], // , true, true, true], // 6-fold
        },
    },
    activeMirror: 'baseMirror',
    view: {
        center: { x: 0, y: 0 },
        // This can't be implemented with svg zoom, because that would muck with line widths of guides and mirrors.
        zoom: 100,
        guides: true,
    },
    selection: null,
    tab: 'Guides',
    palettes: {},
    attachments: {},
    underlays: {},
};
