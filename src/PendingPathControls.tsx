/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { PendingPathPair } from './Guides';
import { Coord, Id, Intersect, Segment } from './types';
import { backUp, goForward, goLeft, goRight, isComplete } from './DrawPath';
import { Primitive } from './intersect';
import { simplifyPath } from './insetPath';
import { ensureClockwise } from './CanvasRender';

export const PendingPathControls = ({
    pendingPath: [state, setState],
    allIntersections,
    guidePrimitives,
    onComplete,
}: {
    pendingPath: PendingPathPair;
    allIntersections: Array<Intersect>;
    guidePrimitives: Array<{ prim: Primitive; guides: Array<Id> }>;
    onComplete: (
        isClip: boolean,
        origin: Coord,
        segments: Array<Segment>,
    ) => void;
}) => {
    if (!state) {
        return null;
    }
    return (
        <div
            css={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
            }}
        >
            {isComplete(state) ? (
                <>
                    <button
                        css={{ fontSize: 40, flex: 1 }}
                        onClick={() => {
                            onComplete(
                                state.isClip,
                                state.origin.coord,
                                simplifyPath(
                                    ensureClockwise(
                                        state.parts.map((p) => p.segment),
                                    ),
                                ),
                            );
                        }}
                    >
                        finish ✅
                    </button>
                    <button
                        css={{ fontSize: 40, flex: 1 }}
                        onClick={() => {
                            setState(
                                backUp(
                                    state.origin,
                                    guidePrimitives,
                                    allIntersections,
                                ),
                            );
                        }}
                    >
                        back ❌
                    </button>
                </>
            ) : (
                <>
                    <button
                        css={{ fontSize: 40, flex: 1 }}
                        onClick={() => {
                            setState(goLeft);
                        }}
                    >
                        👈
                    </button>
                    <button
                        css={{ fontSize: 40, flex: 1 }}
                        onClick={() => {
                            if (state && isComplete(state)) {
                                return onComplete(
                                    state.isClip,
                                    state.origin.coord,
                                    simplifyPath(
                                        ensureClockwise(
                                            state.parts.map((p) => p.segment),
                                        ),
                                    ),
                                );
                            }
                            setState(
                                goForward(guidePrimitives, allIntersections),
                            );
                        }}
                    >
                        ✅
                    </button>
                    <button
                        css={{ fontSize: 40, flex: 1 }}
                        onClick={() => {
                            setState(goRight);
                        }}
                    >
                        👉
                    </button>
                    <button
                        css={{ fontSize: 40, flex: 1 }}
                        onClick={() => {
                            setState(
                                backUp(
                                    state.origin,
                                    guidePrimitives,
                                    allIntersections,
                                ),
                            );
                        }}
                    >
                        ❌
                    </button>
                </>
            )}
        </div>
    );
};
