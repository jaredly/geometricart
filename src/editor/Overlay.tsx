/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Coord, Overlay, Overlay as OverlayT, State, View } from '../types';
import { screenToWorld } from './Canvas';
import { useCurrent } from '../App';

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

    const reScale = resize ? Math.abs(resize.pos.x / resize.origin.x) : 1;

    const scale = reScale * overlay.scale.x;

    const iwidth = ((attachment.width * view.zoom) / 100) * scale;
    const iheight = ((attachment.height * view.zoom) / 100) * scale;

    const x =
        reScale * overlay.center.x * view.zoom +
        (drag ? (drag.current.x - drag.orig.x) * view.zoom : 0);
    const y =
        reScale * overlay.center.y * view.zoom +
        (drag ? (drag.current.y - drag.orig.y) * view.zoom : 0);

    const ref = React.useRef(null as null | SVGImageElement);

    const currentOverlay = useCurrent(overlay);
    const currentAttachment = useCurrent(attachment);

    useMouseDragBad(
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

                const reScale = Math.abs(resize.pos.x / resize.origin.x);
                const scale = reScale * overlay.scale.x;
                // const scale =
                //     ((resize.pos.x - overlay.center.x) /
                //         (resize.origin.x - overlay.center.x)) *
                //     overlay.scale.x;

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
                    center: {
                        x: overlay.center.x * reScale,
                        y: overlay.center.y * reScale,
                    },
                });
                return null;
            });
        }, []),
    );

    useMouseDragBad(
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
                    <g
                        transform={`scale(0.1 0.1) translate(${
                            x * 10 - 1024 / 2
                        } ${y * 10 - 1024 / 2})`}
                        opacity={0.3}
                    >
                        <path d="M909.3 506.3L781.7 405.6a7.23 7.23 0 00-11.7 5.7V476H548V254h64.8c6 0 9.4-7 5.7-11.7L517.7 114.7a7.14 7.14 0 00-11.3 0L405.6 242.3a7.23 7.23 0 005.7 11.7H476v222H254v-64.8c0-6-7-9.4-11.7-5.7L114.7 506.3a7.14 7.14 0 000 11.3l127.5 100.8c4.7 3.7 11.7.4 11.7-5.7V548h222v222h-64.8c-6 0-9.4 7-5.7 11.7l100.8 127.5c2.9 3.7 8.5 3.7 11.3 0l100.8-127.5c3.7-4.7.4-11.7-5.7-11.7H548V548h222v64.8c0 6 7 9.4 11.7 5.7l127.5-100.8a7.3 7.3 0 00.1-11.4z" />
                    </g>
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

export function useMouseDragBad(
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
