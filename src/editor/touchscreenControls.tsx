/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { PendingMirror } from '../App';
import { EyeIcon, EyeInvisibleIcon } from '../icons/Eyes';
import {
    AddIcon,
    BxSelectMultipleIcon,
    CancelIcon,
    DeleteForeverIcon,
    IconButton,
    LineLongerIcon,
    LineShorterIcon,
    MirrorIcon,
    PaintFillIcon,
    SelectDragIcon,
    SubtractLineIcon,
    VectorSelectionIcon,
} from '../icons/Icon';
import { Action, PathMultiply, PendingType } from '../state/Action';
import { guideTypes, Line, State } from '../types';
import { EditorState } from './Canvas';
import { PendingDuplication } from './Guides';
import { Hover } from './Sidebar';

export const selectedPathIds = (state: State) => {
    if (
        state.selection?.type === 'PathGroup' ||
        state.selection?.type === 'Path'
    ) {
        return state.selection.type === 'PathGroup'
            ? Object.keys(state.paths).filter((k) =>
                  state.selection!.ids.includes(state.paths[k].group!),
              )
            : state.selection.ids;
    }
    return [];
};

export function GuideSection({
    state,
    dispatch,
    setDragSelect,
    dragSelect,
    setHover,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
    setDragSelect: (fn: (select: boolean) => boolean) => void;
    dragSelect: boolean;
    setHover: (hover: Hover | null) => void;
}) {
    const tap = React.useRef(false);
    if (state.pending) {
        return (
            <button
                css={{
                    fontSize: 30,
                }}
                onClick={() => dispatch({ type: 'pending:type', kind: null })}
            >
                Cancel guide
            </button>
        );
    }
    return (
        <div key="guide-section">
            <IconButton
                selected={dragSelect}
                onClick={() => {
                    setDragSelect((current) => !current);
                }}
            >
                <SelectDragIcon />
            </IconButton>
        </div>
    );
}

export function selectionSection(
    dispatch: (action: Action) => unknown,
    dragSelect: boolean,
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
    state: State,
    multiSelect: boolean,
    setPendingDuplication: (b: null | PendingDuplication) => void,
): React.ReactNode {
    if (!state.selection) {
        return null;
    }
    return (
        <div>
            <IconButton
                onClick={() => {
                    dispatch({
                        type: 'selection:set',
                        selection: null,
                    });
                }}
            >
                <CancelIcon />
            </IconButton>
            <IconButton
                selected={dragSelect}
                onClick={() => {
                    setEditorState((state) => ({
                        ...state,
                        isDragSelecting: !state.isDragSelecting,
                    }));
                }}
            >
                <SelectDragIcon />
            </IconButton>
            {state.selection.type === 'Guide' &&
            state.selection.ids.length === 1 &&
            state.guides[state.selection.ids[0]] &&
            state.guides[state.selection.ids[0]].geom.type === 'Line' ? (
                <>
                    <IconButton
                        onClick={() => {
                            // dispatch
                            const id = state.selection!.ids[0];
                            const geom = state.guides[id].geom as Line;
                            dispatch({
                                type: 'guide:update',
                                id,
                                guide: {
                                    ...state.guides[id],
                                    geom: {
                                        ...geom,
                                        extent:
                                            geom.extent != null
                                                ? geom.extent + 1
                                                : 2,
                                    },
                                },
                            });
                        }}
                    >
                        <LineLongerIcon />
                    </IconButton>
                    <IconButton
                        onClick={() => {
                            // dispatch
                            const id = state.selection!.ids[0];
                            const geom = state.guides[id].geom as Line;
                            dispatch({
                                type: 'guide:update',
                                id,
                                guide: {
                                    ...state.guides[id],
                                    geom: {
                                        ...geom,
                                        extent:
                                            geom.extent != null
                                                ? Math.max(0, geom.extent - 1)
                                                : 1,
                                    },
                                },
                            });
                        }}
                    >
                        <LineShorterIcon />
                    </IconButton>
                </>
            ) : null}
            {state.selection.type === 'PathGroup' ||
            state.selection.type === 'Path' ? (
                <IconButton
                    onClick={() => {
                        setEditorState((state) => ({
                            ...state,
                            multiSelect: !state.multiSelect,
                        }));
                    }}
                    selected={multiSelect}
                >
                    <BxSelectMultipleIcon />
                </IconButton>
            ) : null}
            <IconButton
                color="rgb(255,200,200)"
                onClick={() => {
                    if (!state.selection) {
                        return;
                    }
                    switch (state.selection.type) {
                        case 'PathGroup':
                            return state.selection.ids.forEach((id) =>
                                dispatch({
                                    type: 'group:delete',
                                    id,
                                }),
                            );
                        case 'Path':
                            return dispatch({
                                type: 'path:delete:many',
                                ids: state.selection.ids,
                            });
                        case 'Guide':
                            return state.selection.ids.forEach((id) =>
                                dispatch({ type: 'guide:delete', id }),
                            );
                    }
                }}
            >
                <DeleteForeverIcon />
            </IconButton>
            {state.activeMirror &&
            (state.selection.type === 'Path' ||
                state.selection.type === 'PathGroup') ? (
                <IconButton
                    onClick={() => {
                        dispatch({
                            type: 'path:multiply',
                            selection:
                                state.selection as PathMultiply['selection'],
                            mirror: state.activeMirror!,
                        });
                    }}
                >
                    <MirrorIcon />
                    <VectorSelectionIcon />
                </IconButton>
            ) : null}
            {(state.selection.type === 'Path' ||
                state.selection.type === 'PathGroup') &&
            state.view.guides ? (
                <IconButton
                    onClick={() => {
                        setPendingDuplication({ reflect: false, p0: null });
                    }}
                >
                    <VectorSelectionIcon />
                </IconButton>
            ) : null}
        </div>
    );
}

export function mirrorControls(
    setPendingMirror: (
        fn:
            | PendingMirror
            | ((m: PendingMirror | null) => PendingMirror | null)
            | null,
    ) => void,
    pendingMirror: PendingMirror,
): React.ReactChild {
    return (
        <div>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => setPendingMirror(null)}
            >
                <CancelIcon />
            </IconButton>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => {
                    setPendingMirror((mirror) =>
                        mirror
                            ? {
                                  ...mirror,
                                  rotations: mirror.rotations + 1,
                              }
                            : null,
                    );
                }}
            >
                <AddIcon />
            </IconButton>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => {
                    setPendingMirror((mirror) =>
                        mirror
                            ? {
                                  ...mirror,
                                  rotations: Math.max(1, mirror.rotations - 1),
                              }
                            : null,
                    );
                }}
            >
                <SubtractLineIcon />
            </IconButton>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => {
                    setPendingMirror((mirror) =>
                        mirror
                            ? {
                                  ...mirror,
                                  reflect: !mirror.reflect,
                              }
                            : null,
                    );
                }}
                selected={pendingMirror.reflect}
            >
                <MirrorIcon />
            </IconButton>
        </div>
    );
}
