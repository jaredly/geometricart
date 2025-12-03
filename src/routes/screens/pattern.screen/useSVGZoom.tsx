import {useState, useRef, useEffect, useCallback} from 'react';
import {Coord} from '../../../types';
import {Box} from './export-types';

export const percentToWorld = (percent: Coord, viewBox: Box) => {
    const x = viewBox.width * percent.x + viewBox.x;
    const y = viewBox.height * percent.y + viewBox.y;
    return {x, y};
};

export const worldToPercent = (world: Coord, viewBox: Box) => {
    return {x: (world.x - viewBox.x) / viewBox.width, y: (world.y - viewBox.y) / viewBox.height};
};

export function svgCoord(evt: React.MouseEvent<SVGSVGElement>) {
    const box = evt.currentTarget.getBoundingClientRect();
    const vb = evt.currentTarget.viewBox.animVal;
    return percentToWorld(worldToPercent({x: evt.clientX, y: evt.clientY}, box), vb);
}

export const useElementZoom = (initialSize: number) => {
    const [box, setBox] = useState({
        x: -initialSize / 2,
        y: -initialSize / 2,
        width: initialSize,
        height: initialSize,
    });

    const latest = useRef(box);
    latest.current = box;
    const ref = useRef<HTMLElement | SVGElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        const fn = function (this: HTMLElement | SVGElement, evt: WheelEvent) {
            evt.preventDefault();

            const nbox = {...latest.current};

            if (evt.shiftKey) {
                nbox.x += nbox.width * 0.003 * evt.deltaX;
                nbox.y += nbox.height * 0.003 * evt.deltaY;
                latest.current = nbox;
                return setBox(nbox);
            }

            nbox.width *= 1 + evt.deltaY * 0.01;
            nbox.height *= 1 + evt.deltaY * 0.01;

            const percent = worldToPercent(
                {x: evt.clientX, y: evt.clientY},
                this.getBoundingClientRect(),
            );
            const pre = percentToWorld(percent, latest.current);
            const post = percentToWorld(percent, nbox);

            nbox.x -= post.x - pre.x;
            nbox.y -= post.y - pre.y;

            latest.current = nbox;
            setBox(nbox);
        } as EventListenerOrEventListenerObject;
        ref.current.addEventListener('wheel', fn, {passive: false});
        return () => ref.current?.removeEventListener('wheel', fn);
    }, []);

    const reset = useCallback(
        (keepZoom = false) =>
            setBox(
                keepZoom
                    ? (box) => ({
                          ...box,
                          x: -box.width / 2,
                          y: -box.height / 2,
                      })
                    : {
                          x: -initialSize / 2,
                          y: -initialSize / 2,
                          width: initialSize,
                          height: initialSize,
                      },
            ),
        [initialSize],
    );

    const canReset =
        box.x !== -initialSize / 2 ||
        box.y !== -initialSize / 2 ||
        box.width !== initialSize ||
        box.height !== initialSize;

    return {
        zoomProps: {
            innerRef: ref,
            box,
            // viewBox: `${box.x.toFixed(4)} ${box.y.toFixed(4)} ${box.width.toFixed(4)} ${box.height.toFixed(4)}`,
            // onWheelCapture,
        },
        box,
        reset: canReset ? reset : null,
    };
};
