
import {angleTo, dist, push} from '../rendering/getMirrorTransforms';
import {lineToSlope, Primitive} from '../rendering/intersect';
import {Coord, View} from '../types';
import {EditorState} from './Canvas';
import {CompassState, PendingMark, previewPos} from './compassAndRuler';
import {RenderPrimitive} from './RenderPrimitive';
import {Bounds} from './Bounds';

type Dot = {type: 'dot'; pos: Coord; active: boolean};

type Shapes = ({type: 'prim'; prim: Primitive; dashed: boolean} | Dot | null)[];

export const isCompass = (state: CompassState['state']) =>
    ['PO', 'PA1', 'PA2', 'DC'].includes(state);

const diamond = (p1: Coord, p2: Coord): Primitive[] => {
    const theta = angleTo(p1, p2);
    const mag = dist(p1, p2);
    const mid = push(p1, theta, mag / 2);
    const o1 = push(mid, theta + Math.PI / 2, mag / 10);
    const o2 = push(mid, theta + Math.PI / 2, -mag / 10);
    return [
        lineToSlope(p1, o1, true),
        lineToSlope(p1, o2, true),
        lineToSlope(p2, o1, true),
        lineToSlope(p2, o2, true),
    ];
};

const compassShapes = (state: CompassState): Shapes => {
    if (isCompass(state.state)) {
        const mid = push(
            state.compassOrigin,
            angleTo(state.compassOrigin, state.compassRadius.p2),
            state.compassRadius.radius / 2,
        );
        const shapes: Shapes = [
            ...diamond(state.compassRadius.p1, state.compassRadius.p2).map((prim) => ({
                type: 'prim' as const,
                prim,
                dashed: true,
            })),
            {
                type: 'dot',
                pos: state.compassOrigin,
                active: state.state === 'PO' || state.state === 'PA1',
            },
            {
                type: 'dot',
                pos: state.compassRadius.p2,
                active: state.state === 'PA2',
            },
            {
                type: 'prim',
                prim: {
                    type: 'circle',
                    center: state.compassOrigin,
                    radius: state.compassRadius.radius,
                },
                dashed: true,
            },
        ];
        if (state.pendingMark?.type === 'circle') {
            shapes.push({
                type: 'prim',
                prim: {
                    type: 'circle',
                    center: state.compassOrigin,
                    radius: state.compassRadius.radius,
                    limit: [state.pendingMark.t1, state.pendingMark.t2],
                },
                dashed: false,
            });
            shapes.push({
                type: 'dot',
                pos: push(state.compassOrigin, state.pendingMark.t1, state.compassRadius.radius),
                active: state.pendingMark.t1 === state.pendingMark.t2,
            });
            if (state.pendingMark.t1 !== state.pendingMark.t2) {
                shapes.push({
                    type: 'dot',
                    pos: push(
                        state.compassOrigin,
                        state.pendingMark.t2,
                        state.compassRadius.radius,
                    ),
                    active: true,
                });
            }
        }
        return shapes;
    } else {
        const shapes: Shapes = [
            {
                type: 'dot',
                pos: state.rulerP1,
                active: state.state === 'R1',
            },
            {
                type: 'dot',
                pos: state.rulerP2,
                active: state.state === 'R2',
            },
            {
                type: 'prim',
                prim: lineToSlope(state.rulerP1, state.rulerP2),
                dashed: true,
            },
        ];

        if (state.pendingMark?.type === 'line') {
            shapes.push({
                type: 'dot',
                pos: state.pendingMark.p1,
                active: state.pendingMark.p1 === state.pendingMark.p2,
            });
            if (state.pendingMark.p1 !== state.pendingMark.p2) {
                shapes.push({
                    type: 'prim',
                    prim: lineToSlope(state.pendingMark.p1, state.pendingMark.p2, true),
                    dashed: false,
                });
                shapes.push({type: 'dot', pos: state.pendingMark.p2, active: true});
            }
        }

        return shapes;
    }
};

export const RenderCompassAndRuler = ({
    state,
    editorState,
    bounds,
    view,
    pendingMark,
}: {
    pendingMark: PendingMark | undefined;
    state?: CompassState;
    editorState: EditorState;
    view: View;
    bounds: Bounds;
}) => {
    const withPos = previewPos(state, editorState.pos);
    const shapes = compassShapes({...withPos, pendingMark});
    return (
        <>
            {shapes.map((shape, i) =>
                shape?.type === 'dot' ? (
                    <circle
                        cx={shape.pos.x * view.zoom}
                        cy={shape.pos.y * view.zoom}
                        r={5}
                        pointerEvents={'none'}
                        style={{pointerEvents: 'none'}}
                        stroke="red"
                        fill="none"
                        strokeWidth={shape.active ? 3 : 1}
                        key={i}
                    />
                ) : shape?.type === 'prim' ? (
                    <RenderPrimitive
                        key={i}
                        prim={shape.prim}
                        isImplied={shape.dashed}
                        ignoreMouse
                        bounds={bounds}
                        zoom={view.zoom}
                    />
                ) : null,
            )}
        </>
    );
};
