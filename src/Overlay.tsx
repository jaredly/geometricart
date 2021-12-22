/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Coord, Overlay, Overlay as OverlayT, State, View } from './types';
import { screenToWorld } from './Canvas';
import { useCurrent } from './App';

export function Overlay({
    state,
    id,
    view,
    width,
    height,
    onUpdate,
}: {
    state: State;
    id: string;
    view: View;
    width: number;
    height: number;
    onUpdate: (overlay: OverlayT) => void;
}) {
    const [drag, setDrag] = React.useState(
        null as null | { orig: Coord; current: Coord },
    );

    const [resize, setResize] = React.useState(
        null as null | { origin: Coord; pos: Coord },
    );

    const overlay = state.overlays[id];
    const attachment = state.attachments[overlay.source];

    const scale = resize
        ? ((resize.pos.x - overlay.center.x) /
              (resize.origin.x - overlay.center.x)) *
          overlay.scale.x
        : overlay.scale.x;

    const iwidth = ((attachment.width * view.zoom) / 100) * scale;
    const iheight = ((attachment.height * view.zoom) / 100) * scale;
    // const iwidth = resize
    //     ? Math.abs(
    // 		(resize.pos.x - overlay.center.x) /
    // 		(resize.origin.x - overlay.center.x)
    // 		// resize.pos.x - overlay.center.x
    // 	) * overlay.scale.x
    //     : ((attachment.width * view.zoom) / 100) * overlay.scale.x;
    // const iheight = resize
    //     ? Math.abs(resize.pos.y - overlay.center.y) * 2 * view.zoom
    //     : ((attachment.height * view.zoom) / 100) * overlay.scale.y;

    const x =
        overlay.center.x * view.zoom +
        (drag ? (drag.current.x - drag.orig.x) * view.zoom : 0);
    const y =
        overlay.center.y * view.zoom +
        (drag ? (drag.current.y - drag.orig.y) * view.zoom : 0);

    const ref = React.useRef(null as null | SVGImageElement);

    const currentOverlay = useCurrent(overlay);
    const currentAttachment = useCurrent(attachment);

    useMouseDrag(
        !!resize,
        ref,
        width,
        height,
        view,
        React.useCallback((pos) => {
            setResize((res) => (res ? { ...res, pos } : res));
        }, []),
        React.useCallback(() => {
            setResize((resize) => {
                if (!resize) {
                    return null;
                }
                const overlay = currentOverlay.current;

                const scale =
                    ((resize.pos.x - overlay.center.x) /
                        (resize.origin.x - overlay.center.x)) *
                    overlay.scale.x;

                // const iwidth = ((attachment.width * view.zoom) / 100) * scale;
                // const iheight = ((attachment.height * view.zoom) / 100) * scale;

                // const w =
                //     Math.abs(resize.pos.x - overlay.center.x) *
                //     2;
                // const h =
                //     Math.abs(resize.pos.y - overlay.center.y) *
                //     2;

                // const iwidth =
                //     (currentAttachment.current.width / 100) *
                //     overlay.scale.x;
                // const iheight =
                //     (currentAttachment.current.height / 100) *
                //     overlay.scale.y;

                // const scale = {
                //     x: overlay.scale.x * (w / iwidth),
                //     y: overlay.scale.y * (h / iheight),
                // };
                onUpdate({
                    ...overlay,
                    scale: { x: scale, y: scale },
                });
                return null;
            });
        }, []),
    );

    useMouseDrag(
        !!drag,
        ref,
        width,
        height,
        view,
        React.useCallback((pos) => {
            setDrag((drag) => (drag ? { ...drag, current: pos } : drag));
        }, []),
        React.useCallback(() => {
            setDrag((drag) => {
                if (!drag) {
                    return null;
                }

                onUpdate({
                    ...currentOverlay.current,
                    center: {
                        x:
                            currentOverlay.current.center.x +
                            (drag.current.x - drag.orig.x),
                        y:
                            currentOverlay.current.center.y +
                            (drag.current.y - drag.orig.y),
                    },
                });
                return null;
            });
        }, []),
    );

    const isSelected =
        state.selection?.type === 'Overlay' && state.selection.ids.includes(id);
    return (
        <>
            <image
                key={id}
                href={attachment.contents}
                ref={(node) => (ref.current = node)}
                width={iwidth}
                height={iheight}
                opacity={isSelected ? 0.8 : overlay.opacity}
                x={-iwidth / 2 + x}
                y={-iheight / 2 + y}
                style={isSelected ? {} : { pointerEvents: 'none' }}
                onClick={(evt) => evt.stopPropagation()}
                onMouseDown={(evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    const svg = findSvg(evt.currentTarget);
                    if (!svg) {
                        return console.warn('NOS SVG');
                    }
                    if (evt.shiftKey) {
                        const rect = svg.getBoundingClientRect();
                        const pos = screenToWorld(
                            width,
                            height,
                            {
                                x: evt.clientX - rect.left,
                                y: evt.clientY - rect.top,
                            },
                            view,
                        );
                        setResize({ origin: pos, pos });
                        return;
                    }
                    const rect = svg.getBoundingClientRect();
                    // evt.
                    const pos = screenToWorld(
                        width,
                        height,
                        {
                            x: evt.clientX - rect.left,
                            y: evt.clientY - rect.top,
                        },
                        view,
                    );
                    setDrag({ orig: pos, current: pos });
                }}
            />
            {isSelected ? (
                <>
                    <circle
                        cx={iwidth / 2 + x}
                        cy={iheight / 2 + y}
                        r={20}
                        onClick={(evt) => evt.stopPropagation()}
                        onMouseDown={(evt) => {
                            evt.stopPropagation();
                            evt.preventDefault();
                            const svg = findSvg(evt.currentTarget);
                            if (!svg) {
                                return console.warn('NOS SVG');
                            }
                            const rect = svg.getBoundingClientRect();
                            const pos = screenToWorld(
                                width,
                                height,
                                {
                                    x: evt.clientX - rect.left,
                                    y: evt.clientY - rect.top,
                                },
                                view,
                            );
                            setResize({ origin: pos, pos });
                        }}
                    />
                    {/* {drag ? (
                        <circle
                            cx={drag.current.x * view.zoom}
                            cy={drag.current.y * view.zoom}
                            r={30}
                            fill="rgba(255,0,0,0.5)"
                        />
                    ) : null} */}
                    {/* {resize ? (
                        <circle
                            cx={resize.x * view.zoom}
                            cy={resize.y * view.zoom}
                            r={30}
                            fill="rgba(255,0,0,0.5)"
                        />
                    ) : null} */}
                </>
            ) : null}
        </>
    );
}

export const findSvg = (value: HTMLElement | SVGElement) => {
    while (!(value instanceof SVGSVGElement)) {
        if (!value.parentElement || value === value.parentElement) {
            return null;
        }
        value = value.parentElement;
    }
    return value;
};

export function useMouseDrag(
    active: boolean,
    ref: React.MutableRefObject<SVGImageElement | null>,
    width: number,
    height: number,
    view: View,
    onDrag: (pos: Coord) => void,
    onDrop: () => void,
) {
    const currentView = useCurrent(view);
    React.useEffect(() => {
        if (!active) {
            return;
        }
        const move = (evt: MouseEvent) => {
            if (!ref.current) {
                return;
            }
            // console.log(`VIEW`, currentView.current);
            const svg = findSvg(ref.current);
            if (!svg) {
                return console.warn('NOS SVG');
            }
            const rect = svg.getBoundingClientRect();
            const rel = {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top,
            };
            const pos = screenToWorld(width, height, rel, currentView.current);
            // console.log(`REL`, rel, pos);
            onDrag(pos);
        };
        const up = () => {
            onDrop();
        };
        document.addEventListener('mouseup', up);
        document.addEventListener('mousemove', move);
        return () => {
            document.removeEventListener('mouseup', up);
            document.removeEventListener('mousemove', move);
        };
    }, [onDrag, onDrop, active, width, height]);
}
