import React from 'react';
import { Coord, View } from './types';
import { dragView, screenToWorld, viewPos } from './Canvas';

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

    return React.useMemo(
        () => ({
            onTouchMove: (evt: React.TouchEvent) => {
                const touch = evt.touches[0];
                if (dragPos) {
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const clientX = touch.clientX;
                    const clientY = touch.clientY;

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
                        x: (touch.clientX - rect.left - x) / view.zoom,
                        y: (touch.clientY - rect.top - y) / view.zoom,
                    };
                    setPos(pos);
                }
            },
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
            onTouchEnd: (evt: React.TouchEvent) => {
                if (dragPos) {
                    setDragPos(null);
                }
            },
            onMouseUpCapture: (evt: React.MouseEvent) => {
                if (dragPos) {
                    setDragPos(null);
                    evt.preventDefault();
                }
            },
            onTouchStart: (evt: React.TouchEvent) => {
                // evt.preventDefault();
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
        }),
        [dragPos, width, height, x, y, view],
    );
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
                if (dragPos) {
                    setDragPos(null);
                    evt.preventDefault();
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
