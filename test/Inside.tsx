import React, { useMemo, useRef } from 'react';
import { initialState } from '../src/state/initialState';
import { useDropStateTarget } from '../src/editor/useDropTarget';
import { sortedVisibleInsetPaths } from '../src/rendering/sortedVisibleInsetPaths';
import Prando from 'prando';
import { segmentsBounds } from '../src/editor/Export';
import { insidePath } from '../src/rendering/clipPath';
import { pathToPrimitives } from '../src/editor/findSelection';
import { Path } from '../src/types';

export const DebugInside = ({ path }: { path: Path }) => {
    const canvasRef = useRef(null as null | HTMLCanvasElement);

    const pixel = 5;

    const bounds = React.useMemo(() => segmentsBounds(path.segments), [path]);

    let w = bounds.x1 - bounds.x0;
    let h = bounds.y1 - bounds.y0;

    const margin = w / 10;
    w += margin * 2;
    h += margin * 2;

    const width = 100 * pixel;
    const scale = width / w;
    const height = Math.floor(h * scale);

    React.useEffect(() => {
        if (!canvasRef.current || !bounds) {
            return;
        }
        const ctx = canvasRef.current!.getContext('2d')!;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        const primitives = pathToPrimitives(path.segments);

        for (let x = 0; x < width / pixel; x++) {
            for (let y = 0; y < height / pixel; y++) {
                const inside = insidePath(
                    {
                        x: bounds.x0 - margin + (x * pixel) / scale,
                        y: bounds.y0 - margin + (y * pixel) / scale,
                    },
                    primitives,
                );
                if (inside) {
                    ctx.fillStyle = 'red';
                } else {
                    ctx.fillStyle = 'black';
                }
                ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
            }
        }
    }, [path]);

    return (
        <div>
            <canvas
                onMouseMove={(evt) => {
                    const box = canvasRef.current!.getBoundingClientRect();
                    const dx = evt.clientX - box.left;
                    const dy = evt.clientY - box.top;
                }}
                ref={canvasRef}
                // style={{
                //     width: 500,
                //     height: 500,
                // }}
                width={500}
                height={500}
            />
        </div>
    );
};

export const Inside = () => {
    const [state, setState] = React.useState(initialState);
    const [dragging, callbacks] = useDropStateTarget((state) => {
        if (state) {
            setState(state);
        }
    });

    const [index, setIndex] = React.useState(0);

    const paths = useMemo(
        () =>
            sortedVisibleInsetPaths(
                state.paths,
                state.pathGroups,
                new Prando('ok'),
            ),
        [state],
    );

    return (
        <div
            {...callbacks}
            style={{
                backgroundColor: dragging ? '#aaa' : 'transparent',
                height: '100vh',
                padding: 24,
            }}
        >
            Hello folks
            {paths.length} paths. {index}
            <button
                onClick={() =>
                    setIndex(index === 0 ? paths.length - 1 : index - 1)
                }
            >
                prev
            </button>
            <button onClick={() => setIndex(index + (1 % paths.length))}>
                next
            </button>
            {paths[index] ? <DebugInside path={paths[index]} /> : 'No path'}
        </div>
    );
};
