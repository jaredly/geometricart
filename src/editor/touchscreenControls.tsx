
import React, {useMemo} from 'react';
import {PendingMirror} from '../useUIState';
import {
    AddIcon,
    BxSelectMultipleIcon,
    CancelIcon,
    DeleteForeverIcon,
    IconButton,
    LineLongerIcon,
    LineShorterIcon,
    MirrorIcon,
    SelectDragIcon,
    SubtractLineIcon,
    VectorSelectionIcon,
} from '../icons/Icon';
import {Action, PathMultiply, } from '../state/Action';
import {Coord, Line, State} from '../types';
import {EditorState, SelectMode} from './Canvas';
import {PendingDuplication} from './Guides';
import {closestPoint} from '../animation/getBuiltins';

export const selectedPathIds = (state: State) => {
    if (state.selection?.type === 'PathGroup' || state.selection?.type === 'Path') {
        return state.selection.type === 'PathGroup'
            ? Object.keys(state.paths).filter((k) =>
                  state.selection!.ids.includes(state.paths[k].group!),
              )
            : state.selection.ids;
    }
    return [];
};

export const RadiusSelector = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
    // setDragSelect: (fn: (select: SelectMode) => boolean) => void;
    // dragSelect: SelectMode;
    // setHover: (hover: Hover | null) => void;
}) => {
    const closestPoints = useMemo(() => {
        const points: {[key: string]: [number, Coord]} = {};
        let max = 0;
        Object.entries(state.paths).forEach(([key, path]) => {
            points[key] = closestPoint(state.view.center, path.segments);
            max = Math.max(max, points[key][0]);
        });
        return {max, map: points};
    }, [state.paths, state.view.center]);

    return (
        <input
            type="range"
            min="0"
            style={{width: 500}}
            max={closestPoints.max}
            step={closestPoints.max / 100}
            onInput={(evt) => {
                console.log(evt.currentTarget.value);
                dispatch({
                    type: 'selection:set',
                    selection: {
                        type: 'Path',
                        ids: Object.keys(closestPoints.map).filter(
                            (k) => closestPoints.map[k][0] < +evt.currentTarget.value,
                        ),
                    },
                });
            }}
        />
    );
};

// export function GuideSection({
//     state,
//     dispatch,
//     setDragSelect,
//     dragSelect,
//     setHover,
// }: {
//     state: State;
//     dispatch: (action: Action) => unknown;
//     setDragSelect: (fn: (select: SelectMode) => boolean) => void;
//     dragSelect: SelectMode;
//     setHover: (hover: Hover | null) => void;
// }) {
//     // const tap = React.useRef(false);
//     if (state.pending) {
//         return (
//             <button
//                 css={{
//                     fontSize: 30,
//                 }}
//                 onClick={() => dispatch({ type: 'pending:type', kind: null })}
//             >
//                 Cancel guide
//             </button>
//         );
//     }

//     return null
// }

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

export function mirrorControls(
    setPendingMirror: (
        fn: PendingMirror | ((m: PendingMirror | null) => PendingMirror | null) | null,
    ) => void,
    pendingMirror: PendingMirror,
): React.ReactElement {
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
