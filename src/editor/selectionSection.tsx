import React from 'react';
import {BxSelectMultipleIcon, CancelIcon, DeleteForeverIcon, IconButton, LineLongerIcon, LineShorterIcon, MirrorIcon, SelectDragIcon, VectorSelectionIcon} from '../icons/Icon';
import {Action, PathMultiply} from '../state/Action';
import {Line, State} from '../types';
import {EditorState, SelectMode} from './Canvas.MenuItem.related';
import {PendingDuplication} from './Guides.PendingDuplication.related';

export function selectionSection(
    dispatch: (action: Action) => unknown,
    selectMode: SelectMode,
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
                selected={selectMode === true}
                onClick={() => {
                    setEditorState((state) => ({
                        ...state,
                        selectMode: !state.selectMode,
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
                                        extent: geom.extent != null ? geom.extent + 1 : 2,
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
                                            geom.extent != null ? Math.max(0, geom.extent - 1) : 1,
                                    },
                                },
                            });
                        }}
                    >
                        <LineShorterIcon />
                    </IconButton>
                </>
            ) : null}
            {state.selection.type === 'PathGroup' || state.selection.type === 'Path' ? (
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
                                dispatch({type: 'guide:delete', id}),
                            );
                    }
                }}
            >
                <DeleteForeverIcon />
            </IconButton>
            {state.activeMirror &&
            (state.selection.type === 'Path' || state.selection.type === 'PathGroup') ? (
                <IconButton
                    onClick={() => {
                        dispatch({
                            type: 'path:multiply',
                            selection: state.selection as PathMultiply['selection'],
                            mirror: state.activeMirror!,
                        });
                    }}
                >
                    <MirrorIcon />
                    <VectorSelectionIcon />
                </IconButton>
            ) : null}
            {(state.selection.type === 'Path' || state.selection.type === 'PathGroup') &&
            state.view.guides ? (
                <IconButton
                    onClick={() => {
                        setPendingDuplication({reflect: false, p0: null});
                    }}
                >
                    <VectorSelectionIcon />
                </IconButton>
            ) : null}
        </div>
    );
}