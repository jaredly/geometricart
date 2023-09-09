import { State, History } from '../types';

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
    version: 12,
    meta: {
        title: '',
        description: '',
        created: 0,
        ppi: 170,
    },
    tilings: {},
    gcode: {
        clearHeight: 3,
        items: [],
        pauseHeight: 30,
    },
    animations: {
        timelines: [{ enabled: true, items: [] }],
        scripts: {},
        lerps: {},
        config: {
            backgroundAlpha: null,
            crop: 10,
            fps: 50,
            increment: 0.01,
            restrictAspectRatio: false,
            zoom: 1,
        },
    },
    pending: null,
    nextId: 0,
    paths: {},
    history: initialHistory,
    pathGroups: {},
    guides: {
        // base: {
        //     id: 'base',
        //     geom: {
        //         type: 'Circle',
        //         center: { x: 0, y: 0 },
        //         radius: { x: 0, y: -1 },
        //         line: true,
        //         half: false,
        //         multiples: 0,
        //     },
        //     active: true,
        //     basedOn: [],
        //     mirror: 'baseMirror',
        // },
    },
    mirrors: {
        // second: {
        // 	id: 'second',
        // 	reflect: true,
        // },
        // baseMirror: {
        //     id: 'baseMirror',
        //     origin: { x: 0, y: 0 },
        //     parent: null,
        //     point: { x: 0, y: -1 },
        //     reflect: true,
        //     rotational: [true, true, true, true, true], // 6-fold
        // },
    },
    activeMirror: null, // 'baseMirror',
    view: {
        center: { x: 0, y: 0 },
        // This can't be implemented with svg zoom, because that would muck with line widths of guides and mirrors.
        zoom: 100,
        guides: true,
    },
    clips: {},
    selection: null,
    tab: 'Undo',
    palette: [
        '#001219',
        '#005f73',
        '#0a9396',
        '#94d2bd',
        '#e9d8a6',
        '#ee9b00',
        '#ca6702',
        '#bb3e03',
        '#ae2012',
        '#9b2226',
    ],
    palettes: {
        default: [
            '#001219',
            '#005f73',
            '#0a9396',
            '#94d2bd',
            '#e9d8a6',
            '#ee9b00',
            '#ca6702',
            '#bb3e03',
            '#ae2012',
            '#9b2226',
        ],
        palette1: [
            '#03045e',
            '#023e8a',
            '#0077b6',
            '#0096c7',
            '#00b4d8',
            '#48cae4',
            '#90e0ef',
            '#ade8f4',
            '#caf0f8',
        ],
        palette2: [
            '#ff6d00',
            '#ff7900',
            '#ff8500',
            '#ff9100',
            '#ff9e00',
            '#240046',
            '#3c096c',
            '#5a189a',
            '#7b2cbf',
            '#9d4edd',
        ],
        palette3: [
            '#007f5f',
            '#2b9348',
            '#55a630',
            '#80b918',
            '#aacc00',
            '#bfd200',
            '#d4d700',
            '#dddf00',
            '#eeef20',
            '#ffff3f',
        ],
    },
    // activePalette: 'default',
    attachments: {},
    overlays: {},
};
