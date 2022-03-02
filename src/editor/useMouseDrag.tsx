import React from 'react';
import { Coord, View } from '../types';
import { dragView, screenToWorld, viewPos } from './Canvas';
import { dist } from '../rendering/getMirrorTransforms';

export function useMouseDrag(
    dragPos: { view: View; coord: Coord } | null,
    setTmpView: React.Dispatch<React.SetStateAction<View | null>>,
    width: number,
    height: number,
    view: View,
    setPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    setDragPos: React.Dispatch<
        React.SetStateAction<{ view: View; coord: Coord } | null>
    >,
) {
    const { x, y } = viewPos(view, width, height);
    const ref = React.useRef(
        null as
            | null
            | false
            | { type: 'one'; coord: Coord; view: View }
            | { type: 'two'; one: Coord; two: Coord; view: View },
    );

    return React.useMemo(
        () => ({
            onMouseMove: (evt: React.MouseEvent) => {
                if (dragPos) {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const clientX = evt.clientX;
                    const clientY = evt.clientY;
                    evt.preventDefault();

                    setTmpView((prev) => {
                        return dragView(
                            prev,
                            dragPos,
                            clientX,
                            rect,
                            clientY,
                            width,
                            height,
                        );
                    });
                } else {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const pos = {
                        x: (evt.clientX - rect.left - x) / view.zoom,
                        y: (evt.clientY - rect.top - y) / view.zoom,
                    };
                    setPos(pos);
                }
            },
            onMouseUpCapture: (evt: React.MouseEvent) => {
                if (dragPos) {
                    setDragPos(null);
                    evt.preventDefault();
                }
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
                setDragPos({
                    coord: coord,
                    view,
                });
            },

            onTouchEnd: (evt: React.TouchEvent) => {
                evt.preventDefault();
                if (evt.touches.length === 0) {
                    ref.current = null;
                    setDragPos(null);
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
                    setDragPos({
                        coord: coord,
                        view,
                    });
                    ref.current = { type: 'one', coord: coord, view };
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
                    setDragPos(null);
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
                    const { coord, view } = ref.current;

                    const touch = evt.touches[0];
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const clientX = touch.clientX;
                    const clientY = touch.clientY;

                    setTmpView((prev) => {
                        return dragView(
                            prev,
                            { coord, view },
                            clientX,
                            rect,
                            clientY,
                            width,
                            height,
                        );
                    });
                } else if (
                    evt.touches.length === 2 &&
                    ref.current.type === 'two'
                ) {
                    const { one, two, view } = ref.current;
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
                    setTmpView({
                        ...view,
                        zoom: view.zoom * scale,
                    });
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
    setPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    setDragPos: React.Dispatch<React.SetStateAction<Coord | null>>,
    cancelDragSelect: (shiftKey: boolean) => void,
) {
    const { x, y } = viewPos(view, width, height);

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
                setPos(pos);
            },
            onTouchEnd: (evt: React.TouchEvent) => {
                evt.preventDefault();
                if (dragPos) {
                    setDragPos(null);
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
                setDragPos(coord);
            },
            onMouseMove: (evt: React.MouseEvent) => {
                const rect = evt.currentTarget.getBoundingClientRect();
                const pos = {
                    x: (evt.clientX - rect.left - x) / view.zoom,
                    y: (evt.clientY - rect.top - y) / view.zoom,
                };
                setPos(pos);
            },
            onMouseUpCapture: (evt: React.MouseEvent) => {
                if (dragPos) {
                    setDragPos(null);
                    evt.preventDefault();
                }
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
                setDragPos(coord);
            },
        }),
        [dragPos, width, height, x, y, view],
    );
}
