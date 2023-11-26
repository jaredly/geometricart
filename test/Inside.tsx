import React, { useMemo, useRef } from 'react';
import { initialState } from '../src/state/initialState';
import { useDropStateTarget } from '../src/editor/useDropTarget';
import { sortedVisibleInsetPaths } from '../src/rendering/sortedVisibleInsetPaths';
import Prando from 'prando';
import { segmentsBounds } from '../src/editor/Bounds';
import { insidePath } from '../src/rendering/clipPath';
import { windingNumber } from '../src/rendering/windingNumber';
import { pathToPrimitives } from '../src/editor/findSelection';
import { Path, State } from '../src/types';
import { ensureClockwise, isClockwise } from '../src/rendering/pathToPoints';

export const DebugInside = ({ path }: { path: Path }) => {
    const canvasRef = useRef(null as null | HTMLCanvasElement);
    const [debug, setDebug] = React.useState([] as Array<any>);

    const segments = path.segments;

    const pixel = 5;

    const bounds = React.useMemo(() => segmentsBounds(segments), [path]);

    let w = bounds.x1 - bounds.x0;
    let h = bounds.y1 - bounds.y0;

    const margin = w / 10;
    w += margin * 2;
    h += margin * 2;

    const width = 100 * pixel;
    const scale = width / w;
    const height = Math.floor(h * scale);

    const primitives = useMemo(() => pathToPrimitives(segments), [path]);

    React.useEffect(() => {
        if (!canvasRef.current || !bounds) {
            return;
        }
        const ctx = canvasRef.current!.getContext('2d')!;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        for (let x = 0; x < width / pixel; x++) {
            for (let y = 0; y < height / pixel; y++) {
                const coord = {
                    x: bounds.x0 - margin + (x * pixel) / scale,
                    y: bounds.y0 - margin + (y * pixel) / scale,
                };
                const wind = windingNumber(coord, primitives, segments);
                const wcount = wind.reduce((c, w) => (w.up ? 1 : -1) + c, 0);
                if (wcount > 0) {
                    ctx.fillStyle = 'red';
                } else {
                    ctx.fillStyle = 'blue';
                }
                ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
            }
        }
    }, [path]);

    return (
        <div>
            {/* Clockwise? {isClockwise(segments) + ''} */}
            <canvas
                onMouseMove={(evt) => {
                    const box = canvasRef.current!.getBoundingClientRect();
                    const dx = evt.clientX - box.left;
                    const dy = evt.clientY - box.top;
                    const round = (a: number, b: number) =>
                        Math.floor(a / b) * b;
                    const x = round(dx, pixel) / scale + bounds.x0 - margin;
                    const y = round(dy, pixel) / scale + bounds.y0 - margin;

                    const coord = { x, y };
                    const wind = windingNumber(coord, primitives, segments);
                    const wcount = wind.reduce(
                        (c, w) => (w.up ? 1 : -1) + c,
                        0,
                    );
                    setDebug([`Ok ${wcount}` as any].concat(wind));
                }}
                ref={canvasRef}
                width={500}
                height={500}
            />
            <div>
                {debug.map((text, i) => (
                    <p key={i}>{JSON.stringify(text)}</p>
                ))}
            </div>
        </div>
    );
};

const key = 'test-inside';
const load = () => {
    const raw = localStorage[key];
    if (raw) {
        return JSON.parse(raw);
    }
    return { state: initialState, index: 0 };
};
const save = (state: State, index: number) =>
    (localStorage[key] = JSON.stringify({ state, index }));

const initial = load();

export const Inside = () => {
    const [state, setState] = React.useState(initial.state);
    const [dragging, callbacks] = useDropStateTarget((state) => {
        if (state) {
            setState(state);
        }
    });

    const [index, setIndex] = React.useState(initial.index);
    // Object.keys(state.paths).forEach((k) => {
    //     if (!isClockwise(state.paths[k].segments)) {
    //         console.log('NOT', k);
    //     }
    // });

    const paths = useMemo(
        () =>
            sortedVisibleInsetPaths(
                state.paths,
                state.pathGroups,
                new Prando('ok'),
                [],
            ),
        [state],
    );

    React.useEffect(() => {
        save(state, index);
    }, [state, index]);

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
            <button onClick={() => setIndex((index + 1) % paths.length)}>
                next
            </button>
            {paths[index] ? <DebugInside path={paths[index]} /> : 'No path'}
        </div>
    );
};
