import {useState, useRef, useEffect} from 'react';
import {worldToPercent, percentToWorld} from './pattern-inspect';

export const useSVGZoom = (initialSize: number) => {
    const [box, setBox] = useState({
        x: -initialSize / 2,
        y: -initialSize / 2,
        width: initialSize,
        height: initialSize,
    });

    const latest = useRef(box);
    const ref = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        const fn = function (this: SVGSVGElement, evt: WheelEvent) {
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
        };
        ref.current.addEventListener('wheel', fn, {passive: false});
        return () => ref.current?.removeEventListener('wheel', fn);
    }, []);

    return {
        zoomProps: {
            ref,
            viewBox: `${box.x.toFixed(4)} ${box.y.toFixed(4)} ${box.width.toFixed(4)} ${box.height.toFixed(4)}`,
            // onWheelCapture,
        },
        box,
    };
};
