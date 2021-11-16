import React from 'react';
import { State, View } from './types';
import { screenToWorld } from './Canvas';

export function useScrollWheel(
    ref: React.MutableRefObject<SVGSVGElement | null>,
    setTmpView: React.Dispatch<React.SetStateAction<View | null>>,
    currentState: React.MutableRefObject<State>,
    width: number,
    height: number,
) {
    React.useEffect(() => {
        if (!ref.current) {
            return console.warn('NO REF');
        }
        const fn = (evt: WheelEvent) => {
            const rect = ref.current!.getBoundingClientRect();
            const clientX = evt.clientX;
            const clientY = evt.clientY;
            const dy = -evt.deltaY;
            evt.preventDefault();

            setTmpView((past) => {
                let view = past || currentState.current.view;

                const screenPos = {
                    x: clientX - rect.left,
                    y: clientY - rect.top,
                };

                const pos = screenToWorld(width, height, screenPos, view);

                const amount = dy / 100 + 1.0;
                const newZoom = Math.min(
                    Math.max(view.zoom * amount, 10),
                    10000,
                );
                const newPos = screenToWorld(width, height, screenPos, {
                    ...view,
                    zoom: newZoom,
                });
                return {
                    ...view,
                    zoom: newZoom,
                    center: {
                        x: view.center.x + (newPos.x - pos.x),
                        y: view.center.y + (newPos.y - pos.y),
                    },
                };
            });
        };
        ref.current!.addEventListener('wheel', fn, { passive: false });
        return () => ref.current!.removeEventListener('wheel', fn);
    }, []);
}
