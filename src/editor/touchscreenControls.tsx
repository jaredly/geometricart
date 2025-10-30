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
import {Action, PathMultiply} from '../state/Action';
import {Coord, Line, State} from '../types';
import {EditorState, SelectMode} from './Canvas.MenuItem.related';
import {PendingDuplication} from './Guides.PendingDuplication.related';
import {closestPoint} from '../animation/getBuiltins';


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


