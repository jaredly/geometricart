
import {useEffect, useRef} from 'react';
import {Coord, Tiling} from './types';
import {handleTiling} from './editor/handleTiling';
import {eigenShapesToLines} from './editor/tilingPoints';
import {plerp} from './Morph';

const TwoPass = ({one, two}: {one: Tiling; two: Tiling}) => {
    const canvas = useRef<HTMLCanvasElement>(null);
    const size = 1000;

    useEffect(() => {
        const ctx = canvas.current!.getContext('2d')!;

        const onez = handleTiling(one);
        const twoz = handleTiling(two);
        // twoz.lines.reverse();
        console.log(onez.lines);
        console.log(twoz.lines);

        const total = 400;

        const scale = 2;

        const draw = (i: number) => {
            const perc = i / total;
            ctx.save();

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.scale(size / scale, size / scale);
            ctx.translate(scale / 2, scale / 2);
            ctx.lineWidth = 1 / 50;

            const lerped = onez.lines.map(([p0, p1], i): [Coord, Coord] => {
                const [p2, p3] = twoz.lines[i];
                return [plerp(p0, p2, perc), plerp(p1, p3, perc)];
            });

            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            onez.bounds.forEach((p, i) => {
                if (i === 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            });
            ctx.fill();

            ctx.strokeStyle = 'blue';
            onez.lines.forEach(([p0, p1], i) => {
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            });
            ctx.strokeStyle = 'green';
            twoz.lines.forEach(([p0, p1], i) => {
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            });

            ctx.strokeStyle = 'red';
            eigenShapesToLines(lerped, one.shape, onez.tr, onez.bounds).forEach(([p0, p1], i) => {
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            });

            ctx.restore();
        };

        draw(0);
        // let dir = 1;
        // const tick = (i: number) => {
        //     draw(i);
        //     if (i >= total) {
        //         dir = -1;
        //         i = total;
        //     }
        //     if (i <= 0) {
        //         dir = 1;
        //         i = 0;
        //     }
        //     requestAnimationFrame(() => tick(i + dir));
        //     // setTimeout(() => tick(i + 1), 1000);
        // };
        // tick(0);
    }, []);

    return (
        <canvas
            ref={canvas}
            width={size}
            height={size}
            style={{
                width: size / 2,
                height: size / 2,
                border: '1px solid magenta',
                margin: 48,
            }}
        />
    );
};
