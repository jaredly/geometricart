/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { MultiStyleForm } from './MultiStyleForm';
import {
    Action,
    Coord,
    guideTypes,
    Id,
    Intersect,
    Line,
    Path,
    PathMultiply,
    PendingType,
    Segment,
    State,
} from './types';
import { DrawPathState } from './DrawPath';
import { Primitive } from './intersect';
import { PendingPathControls } from './PendingPathControls';
import { EyeIcon, EyeInvisibleIcon } from './icons/Eyes';
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
} from './icons/Icon';
import { PendingMirror } from './App';

export const idsToStyle = (state: State) => {
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

export function guideSection(
    state: State,
    dispatch: (action: Action) => unknown,
    setDragSelect: (fn: (select: boolean) => boolean) => void,
    dragSelect: boolean,
): React.ReactNode {
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
    } else if (state.view.guides) {
        return (
            <div>
                <IconButton
                    onClick={() => {
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                guides: !state.view.guides,
                            },
                        });
                    }}
                >
                    <EyeIcon />
                </IconButton>
                <IconButton
                    selected={dragSelect}
                    onClick={() => {
                        setDragSelect((current) => !current);
                    }}
                >
                    <SelectDragIcon />
                </IconButton>

                <select
                    css={{
                        width: 140,
                        fontSize: 30,
                    }}
                    onChange={(evt) => {
                        dispatch({
                            type: 'pending:type',
                            kind: evt.target.value as PendingType['kind'],
                        });
                    }}
                    value={0}
                >
                    <option value={0} disabled>
                        + Guide
                    </option>
                    {guideTypes.map((kind) => (
                        <option value={kind}>{kind}</option>
                    ))}
                </select>
            </div>
        );
    } else {
        return (
            <div>
                <IconButton
                    onClick={() => {
                        dispatch({
                            type: 'view:update',
                            view: {
                                ...state.view,
                                guides: !state.view.guides,
                            },
                        });
                    }}
                >
                    <EyeInvisibleIcon />
                </IconButton>
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
}

export function selectionSection(
    dispatch: (action: Action) => unknown,
    dragSelect: boolean,
    setDragSelect: (fn: (select: boolean) => boolean) => void,
    styleIds: string[],
    setStyleOpen: (fn: (select: boolean) => boolean) => void,
    styleOpen: boolean,
    state: State,
    setMultiSelect: React.Dispatch<React.SetStateAction<boolean>>,
    multiSelect: boolean,
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
                    setDragSelect((current) => !current);
                }}
            >
                <SelectDragIcon />
            </IconButton>
            {styleIds.length ? (
                <IconButton
                    onClick={() => {
                        setStyleOpen((s) => !s);
                    }}
                    selected={styleOpen}
                >
                    <PaintFillIcon />
                </IconButton>
            ) : null}
            {state.selection.type === 'Guide' &&
            state.selection.ids.length === 1 &&
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
                        setMultiSelect((s) => !s);
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
                <button
                    css={{ fontSize: '150%' }}
                    onClick={() => {
                        dispatch({
                            type: 'path:multiply',
                            selection:
                                state.selection as PathMultiply['selection'],
                            mirror: state.activeMirror!,
                        });
                    }}
                >
                    Clone around mirror
                </button>
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
