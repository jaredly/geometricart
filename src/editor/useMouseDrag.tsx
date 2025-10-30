import React from 'react';
import {Coord, View} from '../types';
import {EditorState} from './Canvas.MenuItem.related';
import {dragView, screenToWorld} from './Canvas.screenToWorld.related';
import {dist} from '../rendering/getMirrorTransforms';
import {viewPos} from './viewPos';

export function useMouseDrag(
    dragPos: {view: View; coord: Coord} | null,
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
    width: number,
    height: number,
    view: View,
) {
    const {x, y} = viewPos(view, width, height);
    const ref = React.useRef(
        null as
            | null
            | false
            | {type: 'one'; coord: Coord; view: View}
            | {type: 'two'; one: Coord; two: Coord; view: View},
    );

    return React.useMemo(
        () => ({
            onMouseMove: (evt: React.MouseEvent) => {
                if (dragPos) {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const clientX = evt.clientX;
                    const clientY = evt.clientY;
                    evt.preventDefault();

                    setEditorState((prev) => {
                        return {
                            ...prev,
                            tmpView: dragView(
                                prev.tmpView,
                                dragPos,
                                clientX,
                                rect,
                                clientY,
                                width,
                                height,
                            ),
                        };
                    });
                } else {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const pos = {
                        x: (evt.clientX - rect.left - x) / view.zoom,
                        y: (evt.clientY - rect.top - y) / view.zoom,
                    };
                    setEditorState((state) => ({...state, pos}));
                    // setPos(pos);
                }
            },
            onMouseUpCapture: (evt: React.MouseEvent) => {
                if (dragPos) {
                    setEditorState((state) => ({...state, dragPos: null}));
                    evt.preventDefault();
                }
            },
            onMouseDown: (evt: React.MouseEvent) => {
                if (evt.button !== 0) {
                    return;
                }
                // console.log('drag');
                const rect = evt.currentTarget.getBoundingClientRect();
                const coord = screenToWorld(
                    width,
                    height,
                    {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    },
                    view,
                );
                setEditorState((state) => ({
                    ...state,
                    dragPos: {coord, view},
                }));
            },

            onTouchEnd: (evt: React.TouchEvent) => {
                evt.preventDefault();
                if (evt.touches.length === 0) {
                    ref.current = null;
                    setEditorState((state) => ({...state, dragPos: null}));
                }
            },
            onTouchStart: (evt: React.TouchEvent) => {
                if (ref.current === false) {
                    return;
                }
                if (ref.current == null) {
                    const touch = evt.touches[0];
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const coord = screenToWorld(
                        width,
                        height,
                        {
                            x: touch.clientX - rect.left,
                            y: touch.clientY - rect.top,
                        },
                        view,
                    );
                    setEditorState((state) => ({
                        ...state,
                        dragPos: {coord, view},
                    }));
                    ref.current = {type: 'one', coord: coord, view};
                } else if (ref.current.type === 'one') {
                    const coord = touchToCoord(
                        evt.currentTarget,
                        width,
                        height,
                        evt.changedTouches[0],
                        view,
                    );

                    ref.current = {
                        type: 'two',
                        two: coord,
                        one: ref.current.coord,
                        // hmmmm
                        view: ref.current.view,
                    };
                    // clear out the drag pos
                    setEditorState((state) => ({...state, dragPos: null}));
                } else {
                    // invalidated
                    ref.current = false;
                }
                // evt.preventDefault();
            },
            onTouchMove: (evt: React.TouchEvent) => {
                if (ref.current === false || ref.current == null) {
                    return;
                }
                if (ref.current.type === 'one') {
                    const {coord, view} = ref.current;

                    const touch = evt.touches[0];
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const clientX = touch.clientX;
                    const clientY = touch.clientY;

                    setEditorState((prev) => {
                        return {
                            ...prev,
                            tmpView: dragView(
                                prev.tmpView,
                                {coord, view},
                                clientX,
                                rect,
                                clientY,
                                width,
                                height,
                            ),
                        };
                    });
                } else if (evt.touches.length === 2 && ref.current.type === 'two') {
                    const {one, two, view} = ref.current;
                    const none = touchToCoord(
                        evt.currentTarget,
                        width,
                        height,
                        evt.touches[0],
                        view,
                    );
                    const ntwo = touchToCoord(
                        evt.currentTarget,
                        width,
                        height,
                        evt.touches[1],
                        view,
                    );
                    const d1 = dist(one, two);
                    const d2 = dist(none, ntwo);
                    const scale = d2 / d1;
                    setEditorState((state) => ({
                        ...state,
                        tmpView: {
                            ...view,
                            zoom: view.zoom * scale,
                        },
                    }));
                }
            },
        }),
        [dragPos, width, height, x, y, view],
    );
}

function touchToCoord(
    target: Element,
    width: number,
    height: number,
    touch: React.Touch,
    view: View,
) {
    const rect = target.getBoundingClientRect();
    const coord = screenToWorld(
        width,
        height,
        {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        },
        view,
    );
    return coord;
}

export function useDragSelect(
    dragPos: Coord | null,
    width: number,
    height: number,
    view: View,
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
    cancelDragSelect: (shiftKey: boolean) => void,
) {
    const {x, y} = viewPos(view, width, height);

    return React.useMemo(
        () => ({
            onTouchMove: (evt: React.TouchEvent) => {
                const touch = evt.touches[0];
                const clientX = touch.clientX;
                const clientY = touch.clientY;
                const rect = evt.currentTarget.getBoundingClientRect();
                const pos = {
                    x: (clientX - rect.left - x) / view.zoom,
                    y: (clientY - rect.top - y) / view.zoom,
                };
                setEditorState((state) => ({...state, pos}));
            },
            onTouchEnd: (evt: React.TouchEvent) => {
                evt.preventDefault();
                if (dragPos) {
                    setEditorState((state) => ({
                        ...state,
                        dragSelectPos: null,
                    }));
                }
                cancelDragSelect(evt.shiftKey);
            },
            onTouchStart: (evt: React.TouchEvent) => {
                const touch = evt.touches[0];
                const clientX = touch.clientX;
                const clientY = touch.clientY;
                const rect = evt.currentTarget.getBoundingClientRect();
                const coord = screenToWorld(
                    width,
                    height,
                    {
                        x: clientX - rect.left,
                        y: clientY - rect.top,
                    },
                    view,
                );
                // setDragPos(coord);
                setEditorState((state) => ({...state, dragSelectPos: coord}));
            },
            onMouseMove: (evt: React.MouseEvent) => {
                const rect = evt.currentTarget.getBoundingClientRect();
                const pos = {
                    x: (evt.clientX - rect.left - x) / view.zoom,
                    y: (evt.clientY - rect.top - y) / view.zoom,
                };
                // setPos(pos);
                setEditorState((state) => ({...state, pos}));
            },
            onMouseUpCapture: (evt: React.MouseEvent) => {
                if (dragPos) {
                    // console.log('up capture drag pos seteditorstate');
                    // setDragPos(null);
                    setEditorState((state) => ({
                        ...state,
                        dragSelectPos: null,
                    }));
                    evt.preventDefault();
                }
                // console.log('cancel drag select');
                cancelDragSelect(evt.shiftKey);
            },
            onMouseDown: (evt: React.MouseEvent) => {
                const rect = evt.currentTarget.getBoundingClientRect();
                const coord = screenToWorld(
                    width,
                    height,
                    {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    },
                    view,
                );
                setEditorState((state) => ({...state, dragSelectPos: coord}));
            },
        }),
        [dragPos, width, height, x, y, view],
    );
}
