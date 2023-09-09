/* @jsx jsx */
/* @jsxFrag React.Fragment */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { PendingPathPair } from './Guides';
import { Coord, Id, Intersect, Segment } from '../types';
import {
    backUp,
    DrawPathState,
    goForward,
    goLeft,
    goRight,
    isComplete,
} from './DrawPath';
import { Primitive } from '../rendering/intersect';
import { simplifyPath } from '../rendering/simplifyPath';
import { ensureClockwise } from '../rendering/pathToPoints';
import { PendingPreview } from './PendingPreview';
import { IconButton, RedoIcon, UndoIcon } from '../icons/Icon';
import { EditorState } from './Canvas';

export const PendingPathControls = ({
    editorState,
    setEditorState,
    allIntersections,
    guidePrimitives,
    onComplete,
}: {
    editorState: EditorState;
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
    allIntersections: Array<Intersect>;
    guidePrimitives: Array<{ prim: Primitive; guides: Array<Id> }>;
    onComplete: (
        isClip: boolean,
        origin: Coord,
        segments: Array<Segment>,
    ) => void;
}) => {
    const state = editorState.pending;
    if (state?.type !== 'path') {
        return null;
    }
    const setState = (
        pp: (path: EditorState['pending']) => EditorState['pending'],
    ) => setEditorState((s) => ({ ...s, pending: pp(s.pending) }));
    return (
        <div
            css={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                backgroundColor: 'rgba(0,0,0,0.8)',
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
                    <IconButton
                        css={{
                            display: 'flex',
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onClick={() => {
                            setState(goLeft);
                        }}
                    >
                        <UndoIcon />
                    </IconButton>
                    <div
                        css={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'stretch',
                        }}
                    >
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
                        <PendingPreview
                            state={state}
                            size={100}
                            // guidePrimitives={guidePrimitives}
                            // allIntersections={allIntersections}
                        />

                        <button
                            css={{ fontSize: 40, flex: 1 }}
                            onClick={() => {
                                if (
                                    state?.type === 'path' &&
                                    isComplete(state)
                                ) {
                                    return onComplete(
                                        state.isClip,
                                        state.origin.coord,
                                        simplifyPath(
                                            ensureClockwise(
                                                state.parts.map(
                                                    (p) => p.segment,
                                                ),
                                            ),
                                        ),
                                    );
                                }
                                setState(
                                    goForward(
                                        guidePrimitives,
                                        allIntersections,
                                    ),
                                );
                            }}
                        >
                            ✅
                        </button>
                    </div>
                    <IconButton
                        css={{
                            display: 'flex',
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onClick={() => {
                            setState(goRight);
                        }}
                    >
                        <RedoIcon />
                    </IconButton>
                </>
            )}
        </div>
    );
};
