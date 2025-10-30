import React from 'react';
import {State} from '../types';
import {EditorState} from './Canvas.MenuItem.related';
import {screenToWorld} from './Canvas.screenToWorld.related';

export function useScrollWheel(
    ref: React.MutableRefObject<SVGSVGElement | null>,
    setEditorState: React.Dispatch<React.SetStateAction<EditorState>>,
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
            const dx = -evt.deltaX;
            evt.preventDefault();

            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                setEditorState((state) => ({...state, zooming: false}));
            }, 50);

            if (evt.shiftKey) {
                setEditorState((past) => {
                    let view = past.tmpView || currentState.current.view;

                    return {
                        ...past,
                        tmpView: {
                            ...view,
                            center: {
                                x: view.center.x + dx / view.zoom,
                                y: view.center.y + dy / view.zoom,
                            },
                        },
                        zooming: true,
                    };
                });
                return;
            }

            setEditorState((past) => {
                let view = past.tmpView || currentState.current.view;

                const screenPos = {
                    x: clientX - rect.left,
                    y: clientY - rect.top,
                };

                const pos = screenToWorld(width, height, screenPos, view);

                const amount = dy / 100 + 1.0;
                const newZoom = Math.min(Math.max(view.zoom * amount, 10), 200000);
                const newPos = screenToWorld(width, height, screenPos, {
                    ...view,
                    zoom: newZoom,
                });
                return {
                    ...past,
                    tmpView: {
                        ...view,
                        zoom: newZoom,
                        center: {
                            x: view.center.x + (newPos.x - pos.x),
                            y: view.center.y + (newPos.y - pos.y),
                        },
                    },
                    zooming: true,
                };
            });
        };
        ref.current!.addEventListener('wheel', fn, {passive: false});
        return () => {
            if (timer != null) {
                clearTimeout(timer);
                setEditorState((state) => ({...state, zooming: false}));
            }
            ref.current?.removeEventListener('wheel', fn);
        };
    }, []);
}
