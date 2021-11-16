import React from 'react';
import { Coord, View } from './types';
import { dragView, screenToWorld, viewPos } from './Canvas';

export function useMouseDrag(
    dragPos: { view: View; coord: Coord } | null,
    setTmpView: React.Dispatch<React.SetStateAction<View | null>>,
    width: number,
    height: number,
    // x: number,
    view: View,
    // y: number,
    setPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    setDragPos: React.Dispatch<
        React.SetStateAction<{ view: View; coord: Coord } | null>
    >,
) {
    const { x, y } = viewPos(view, width, height);

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
        }),
        [dragPos, width, height, x, y, view],
    );
}
