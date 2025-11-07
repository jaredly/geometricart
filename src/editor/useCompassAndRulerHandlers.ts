import {useMemo, useRef, useState} from 'react';
import {State, View} from '../types';
import {EditorState, screenToWorld} from './Canvas';
import {
    canFreeClick,
    markToGeom,
    mouseDownMark,
    mouseMoveMark,
    PendingMark,
} from './compassAndRuler';
import {Action} from '../state/Action';

const genId = () => Math.random().toString(36).slice(2);
const useCurrent = <T>(value: T) => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
};

export const useCompassAndRulerHandlers = (
    ref: React.RefObject<SVGSVGElement | null>,
    view: View,
    width: number,
    height: number,
    currentState: React.MutableRefObject<State>,
    dispatch: (action: Action) => unknown,
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
) => {
    const currentView = useRef(view);
    currentView.current = view;
    const [compassDragState, setCompassDragState] = useState(undefined as undefined | PendingMark);
    const cds = useCurrent(compassDragState);

    const compassRulerHandlers = useMemo(
        () => ({
            onMouseDown(evt: React.MouseEvent) {
                const rect = ref.current!.getBoundingClientRect();
                const view = currentView.current;
                const pos = screenToWorld(
                    width,
                    height,
                    {x: evt.clientX - rect.left, y: evt.clientY - rect.top},
                    view,
                );

                const state = currentState.current;
                if (canFreeClick(state.compassState?.state)) {
                    setCompassDragState(mouseDownMark(state.compassState, pos));
                }
            },
            onMouseUp: (evt: React.MouseEvent) => {
                if (!cds.current) return;
                const state = currentState.current;
                const view = currentView.current;
                if (!state.compassState) return;

                const rect = evt.currentTarget.getBoundingClientRect();
                const pos = screenToWorld(
                    width,
                    height,
                    {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    },
                    view,
                );
                const mark = mouseMoveMark(state.compassState, cds.current, pos);

                const geom = markToGeom({...state.compassState, pendingMark: mark});
                if (geom) {
                    const id = genId();
                    dispatch({
                        type: 'guide:add',
                        id,
                        guide: {
                            id,
                            active: true,
                            basedOn: [],
                            geom,
                            mirror: state.activeMirror ? state.mirrors[state.activeMirror] : null,
                        },
                    });
                }
                setCompassDragState(undefined);
            },
            onMouseMove: (evt: React.MouseEvent) => {
                const rect = evt.currentTarget.getBoundingClientRect();
                const view = currentView.current;
                const pos = screenToWorld(
                    width,
                    height,
                    {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    },
                    view,
                );
                const state = currentState.current;
                if (!cds.current || !state.compassState) {
                    setEditorState((state) => ({...state, pos}));
                    return;
                }

                setCompassDragState(mouseMoveMark(state.compassState, cds.current, pos));
            },
        }),
        [],
    );

    return {compassRulerHandlers, compassDragState};
};
