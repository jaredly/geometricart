import {useRef, useEffect} from 'react';

export function useAnimate(
    t: number,
    animate: boolean,
    duration: number,
    setT: (v: number) => void,
    setAnimate: (v: boolean) => void,
) {
    const nt = useRef(t);
    nt.current = t;
    const fpsref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!animate) {
            fpsref.current!.style.display = 'none';
            return;
        }
        fpsref.current!.style.display = 'block';
        const t = nt.current;
        let st = Date.now() - (t > 0.99 ? 0 : t) * duration * 1000;
        let af: number = 0;
        const times: number[] = [];
        let lt = Date.now();
        const step = () => {
            const now = Date.now();
            times.push(now - lt);
            lt = now;
            if (times.length > 2) {
                const some = times.slice(-5);
                const sum = some.reduce((a, b) => a + b, 0);
                // fpsref.current!.textContent = (1000 / (sum / some.length)).toFixed(2) + 'fps';
            }
            const diff = (now - st) / 1000;
            setT(Math.min(1, diff / duration));
            if (diff >= duration) {
                st += duration * 1000;
            }
            // if (diff < duration) {
            af = requestAnimationFrame(step);
            // } else {
            //     setAnimate(false);
            // }
        };
        step();
        return () => cancelAnimationFrame(af);
    }, [animate, duration, setT]);
    return fpsref;
}
