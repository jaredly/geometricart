import {angleBetween} from '../rendering/isAngleBetween';
import {angleTo, dist} from '../rendering/getMirrorTransforms';
import {Coord, Guide, GuideGeom} from '../types';

type States = 'PO' | 'PA1' | 'PA2' | 'DC' | 'R1' | 'R2' | 'DR';

export type PendingMark =
    | {type: 'circle'; t1: number; t2: number; clockwise: boolean}
    | {type: 'line'; p1: Coord; p2: Coord};

export type CompassRenderState = {
    ruler: {p1: Coord; p2: Coord};
    compass: {source: {p1: Coord; p2: Coord}; mark: {p1: Coord; p2: Coord}};
};

export type CompassState = {
    compassRadius: {p1: Coord; p2: Coord; radius: number};
    compassOrigin: Coord;
    rulerP1: Coord;
    rulerP2: Coord;
    state: States;
    pendingMark?: PendingMark;
};

const backspace: Record<States, States> = {
    DC: 'PO',
    PO: 'PA1',
    PA2: 'PA1',
    PA1: 'R1',
    R1: 'PO',
    R2: 'R1',
    DR: 'R1',
};

const clicks: Record<States, States> = {
    DC: 'DC',
    PO: 'DC',
    PA1: 'PA2',
    PA2: 'DC',
    R1: 'R2',
    R2: 'DR',
    DR: 'DR',
};

export const handleSpace = (state?: CompassState): CompassState => {
    if (!state) {
        const no: Coord = {x: 0, y: 0};
        return {
            compassOrigin: no,
            compassRadius: {p1: no, p2: no, radius: 0},
            rulerP1: no,
            rulerP2: no,
            state: 'PA1',
        };
    }
    return {...state, state: backspace[state.state]};
};

/*
UI:

- on mouse move -> previewPos(state, mouse pos)
- on mouse down (intersection)
    - previewPos(state, coord) |> handleClick
- on mouse down (background) if canFreeClick
    - previewPos(state, coord) |> handleClick
- on mouse drag (if canFreeClick)
    - dragPos(state, coord)
    - draw the GuideGeom `markToGeom`
- on mouse up
    - markToGeom, and clear out `pendingMark`

- on space
    - handleSpace


*/

export const canFreeClick = (state?: States) => state === 'DC' || state === 'DR';

export const previewPos = (state: CompassState | undefined, coord: Coord): CompassState => {
    if (!state) {
        return {
            compassOrigin: coord,
            compassRadius: {p1: coord, p2: coord, radius: 0},
            rulerP1: coord,
            rulerP2: coord,
            state: 'PA1',
        };
    }
    switch (state.state) {
        case 'PA1':
            return {
                ...state,
                compassRadius: {
                    p1: coord,
                    p2: {x: coord.x + 1, y: coord.y},
                    radius: 1,
                },
                compassOrigin: coord,
            };
        case 'PA2':
            return {
                ...state,
                compassRadius: {
                    ...state.compassRadius,
                    p2: coord,
                    radius: dist(state.compassRadius.p1, coord),
                },
            };
        case 'DC': {
            if (state.pendingMark?.type === 'circle') return dragPos(state, coord);
            const theta = angleTo(state.compassOrigin, coord);
            return {
                ...state,
                pendingMark: {type: 'circle', t1: theta, t2: theta, clockwise: true},
            };
        }
        case 'PO':
            return {...state, compassOrigin: coord};
        case 'R1':
            return {
                ...state,
                rulerP1: coord,
                rulerP2: {x: coord.x + 1, y: coord.y},
            };
        case 'R2':
            return {...state, rulerP2: coord};
        case 'DR': {
            if (state.pendingMark?.type === 'line') return dragPos(state, coord);
            const p = projectPointOntoLine(coord, state.rulerP1, state.rulerP2);
            return {...state, pendingMark: {type: 'line', p1: p, p2: p}};
        }
    }
};

export const mouseDownMark = (
    state: CompassState | undefined,
    coord: Coord,
): PendingMark | undefined => {
    if (state?.state === 'DC') {
        const theta = angleTo(state.compassOrigin, coord);
        return {type: 'circle', t1: theta, t2: theta, clockwise: true};
    }
    if (state?.state === 'DR') {
        const p = projectPointOntoLine(coord, state.rulerP1, state.rulerP2);
        return {type: 'line', p1: p, p2: p};
    }
};

const projectPointOntoLine = (coord: Coord, a: Coord, b: Coord) => {
    const ap = {x: coord.x - a.x, y: coord.y - a.y};
    const ab = {x: b.x - a.x, y: b.y - a.y};
    const abLenSq = ab.x * ab.x + ab.y * ab.y;
    const dot = ap.x * ab.x + ap.y * ab.y;
    const t = abLenSq === 0 ? 0 : dot / abLenSq;
    return {x: a.x + ab.x * t, y: a.y + ab.y * t};
};

export const mouseMoveMark = (
    state: CompassState,
    mark: PendingMark,
    coord: Coord,
): PendingMark => {
    if (mark.type === 'line') {
        const p2 = projectPointOntoLine(coord, state.rulerP1, state.rulerP2);
        return {...mark, p2};
    }
    const theta = angleTo(state.compassOrigin, coord);

    let clockwise = mark.clockwise;
    const pdiff = angleBetween(mark.t1, mark.t2, true);
    // if previous diff was within 10 degrees of 0, recalc clockwiseness
    if (pdiff < Math.PI / 18 || pdiff > Math.PI * 2 - Math.PI / 18) {
        clockwise = angleBetween(mark.t1, theta, true) < Math.PI;
    }
    return {...mark, t2: theta, clockwise};
};

export const dragPos = (state: CompassState, coord: Coord): CompassState => {
    if (state.state === 'DR' && state.pendingMark?.type === 'line') {
        const p2 = projectPointOntoLine(coord, state.rulerP1, state.rulerP2);
        return {...state, pendingMark: {...state.pendingMark, p2}};
    }
    if (state.state === 'DC' && state.pendingMark?.type === 'circle') {
        const theta = angleTo(state.compassOrigin, coord);

        let clockwise = state.pendingMark.clockwise;
        const pdiff = angleBetween(state.pendingMark.t1, state.pendingMark.t2, true);
        // if previous diff was within 10 degrees of 0, recalc clockwiseness
        if (pdiff < Math.PI / 18 || pdiff > Math.PI * 2 - Math.PI / 18) {
            clockwise = angleBetween(state.pendingMark.t1, theta, true) < Math.PI;
        }
        return {
            ...state,
            pendingMark: {...state.pendingMark, t2: theta, clockwise},
        };
    }
    return state;
};

export const markToGeom = (state: CompassState): null | GuideGeom => {
    if (!state.pendingMark) {
        return null;
    }
    if (state.pendingMark.type === 'line') {
        return state.pendingMark.p1 !== state.pendingMark.p2
            ? {
                  type: 'Line',
                  p1: state.pendingMark.p1,
                  p2: state.pendingMark.p2,
                  extent: 0,
                  limit: true,
              }
            : null;
    } else {
        return state.pendingMark.t1 !== state.pendingMark.t2
            ? {
                  type: 'CircleMark',
                  p1: state.compassRadius.p1,
                  p2: state.compassRadius.p2,
                  p3: state.compassOrigin,
                  angle: state.pendingMark.clockwise ? state.pendingMark.t1 : state.pendingMark.t2,
                  angle2: state.pendingMark.clockwise ? state.pendingMark.t2 : state.pendingMark.t1,
              }
            : {
                  type: 'CloneCircle',
                  p1: state.compassRadius.p1,
                  p2: state.compassRadius.p2,
                  p3: state.compassOrigin,
              };
    }
};

export const handleClick = (state: CompassState): CompassState => {
    return {...state, state: clicks[state.state]};
};
