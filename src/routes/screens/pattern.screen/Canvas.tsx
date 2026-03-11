import {Surface, GrDirectContext} from 'canvaskit-wasm';
import {useRef, useEffect} from 'react';
import {Coord} from '../../../types';
import {RenderItem} from './eval/evaluate';
import {Color} from './export-types';
import {ZoomProps, percentToWorld, worldToPercent} from './hooks/useSVGZoom';
import {getConstrainedSurface} from './render/recordVideo';
import {renderItems} from './render/renderItems';
import {State} from './types/state-type';

export const Canvas = ({
    items,
    setMouse,
    zoomProps: {innerRef, box},
    setSize,
    size,
    bg,
    t,
}: {
    items: RenderItem[];
    bg: Color | null;
    state: State;
    mouse: Coord | null;
    zoomProps: ZoomProps;
    setMouse: (m: Coord | null) => void;
    byKey: Record<string, string[]>;
    t: number;
    setSize: (size: Coord) => void;
    size: Coord;
}) => {
    const sref = useRef<null | {surface: Surface | null; grc: GrDirectContext}>(null);
    // const font = usePromise(() => fetch('/assets/Roboto-Regular.ttf').then((r) => r.arrayBuffer()));
    useEffect(() => {
        if (!sref.current) return;
        const {surface} = sref.current;
        // const {surface, grc} = getConstrainedSurface(innerRef.current.node! as HTMLCanvasElement);
        // no need for AA when previewing
        renderItems(surface!, box, items, bg, false);
        // surface!.delete();
        // grc.releaseResourcesAndAbandonContext();
    }, [box, items, bg]);

    useEffect(() => {
        return () => sref.current?.grc.releaseResourcesAndAbandonContext();
    }, []);

    return (
        <canvas
            ref={(node) => {
                if (node && innerRef.current.node !== node) {
                    sref.current = getConstrainedSurface(node);
                    innerRef.current.node = node;
                    innerRef.current.tick();
                }
            }}
            style={{
                background: 'black',
                width: size.x,
                height: size.y,
            }}
            width={size.x * 2}
            height={size.y * 2}
            onMouseLeave={() => setMouse(null)}
            onMouseMove={(evt) => {
                const cbox = evt.currentTarget.getBoundingClientRect();
                setMouse(
                    percentToWorld(worldToPercent({x: evt.clientX, y: evt.clientY}, cbox), box),
                );
            }}
        />
    );
};
