import * as React from 'react';
import { jsx } from '@emotion/react';
import { Coord } from './types';
import { DrawPathState } from './DrawPath';
import { adjustBounds, largestDimension, segmentBounds } from './Export';
import { RenderSegment } from './RenderSegment';
import { angleTo, push } from './getMirrorTransforms';

export const PendingPreview = ({
    state,
    size,
}: {
    state: DrawPathState;
    size: number;
}) => {
    // So this is the center.
    // What's the scale?
    // Size is the w & h? I think
    // and so radius is half size.
    // and we want to scale to the ... currently selected one?
    // Or, maybe be dynamic. Like... start with the current one being between
    // r and r/2
    // where if there are much longer ones, make it r/2
    // and then if we move to one that's much smaller, expand so it's r/2.
    // Yeah.
    const current = state.parts.length
        ? state.parts[state.parts.length - 1].to.coord
        : state.origin.coord;
    const r = size / 2;

    const segmentSizes = React.useMemo(() => {
        return state.next.map((seg, i) => {
            const bounds = segmentBounds(current, seg.segment);
            const adjusted = adjustBounds(bounds, current);
            return largestDimension(adjusted);
        });
    }, [current, state.next]);

    // const lastR = React.useRef(null)
    // if (lastR.current == null) {
    //     lastR.current = getBestR(state.next)
    // }
    const zoom = r / 2 / segmentSizes[state.selection];

    // const selected = state.next[state.selection]
    // const scale = ...;
    // state.next
    return (
        <svg width={size} height={size} style={{ display: 'block' }}>
            <g
                transform={`translate(${-current.x * zoom + size / 2} ${
                    -current.y * zoom + size / 2
                })`}
            >
                {state.parts.map((part, i) => (
                    <RenderSegment
                        segment={part.segment}
                        prev={
                            i >= 1
                                ? state.parts[i - 1].to.coord
                                : state.origin.coord
                        }
                        color="blue"
                        width={1}
                        zoom={zoom}
                    />
                ))}
                {state.next.map((seg, i) => (
                    <RenderSegment
                        segment={seg.segment}
                        key={i}
                        prev={current}
                        color={
                            i === state.selection
                                ? 'green'
                                : 'rgba(255,0,0,0.5)'
                        }
                        width={2}
                        zoom={zoom}
                    />
                ))}
                <Arrow
                    at={scalePos(state.next[state.selection].to.coord, zoom)}
                    size={5}
                    direction={angleTo(
                        current,
                        state.next[state.selection].to.coord,
                    )}
                    fill="green"
                />
                <circle
                    cx={current.x * zoom}
                    cy={current.y * zoom}
                    r={5}
                    fill="none"
                    stroke="magenta"
                    strokeWidth={1}
                />
            </g>
        </svg>
    );
};
export const Arrow = ({
    size,
    at,
    direction,
    fill,
}: {
    fill: string;
    size: number;
    at: Coord;
    direction: number;
}) => {
    const p1 = push(at, direction, size);
    const p2 = push(at, direction + (Math.PI * 3) / 4, size);
    const p3 = push(at, direction - (Math.PI * 3) / 4, size);
    return (
        <polygon
            points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
            fill={fill}
        />
    );
};

export const scalePos = (pos: Coord, scale: number) => ({
    x: pos.x * scale,
    y: pos.y * scale,
});
