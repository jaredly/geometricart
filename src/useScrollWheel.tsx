import React from 'react';
import { State, View } from './types';
import { screenToWorld } from './Canvas';

export function useScrollWheel(
    ref: React.MutableRefObject<SVGSVGElement | null>,
    setTmpView: React.Dispatch<React.SetStateAction<View | null>>,
    setZooming: (zooming: boolean) => void,
    currentState: React.MutableRefObject<State>,
    width: number,
    height: number,
) {
    React.useEffect(() => {
        if (!ref.current) {
            return console.warn('NO REF');
        }
        let timer = null as null | NodeJS.Timeout;
        const fn = (evt: WheelEvent) => {
            const rect = ref.current!.getBoundingClientRect();
            const clientX = evt.clientX;
            const clientY = evt.clientY;
            const dy = -evt.deltaY;
            evt.preventDefault();

            setZooming(true);
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                setZooming(false);
            }, 50);

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
                    200000,
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
        return () => {
            if (timer != null) {
                clearTimeout(timer);
                setZooming(false);
            }
            ref.current!.removeEventListener('wheel', fn);
        };
    }, []);
}
