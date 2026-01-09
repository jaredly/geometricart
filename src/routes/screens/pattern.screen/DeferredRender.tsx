import {useEffect, useMemo, useRef, useState} from 'react';
import {Coord} from '../../../types';
import {PendingState, PendingStateUpdate, useEditState, usePendingState} from './utils/editState';
import {RenderItem} from './eval/evaluate';
import {Color} from './export-types';
import {State} from './types/state-type';
import {WorkerSend} from './render/render-client';
import {MessageResponse, MessageToWorker} from './render/render-worker';
import {renderShape} from './render/renderShape';
import {Hover} from './utils/resolveMods';
import {Canvas, SVGCanvas} from './SVGCanvas';
import {ZoomProps} from './hooks/useSVGZoom';
import {expandShapes} from './utils/expandShapes';

export const renderShapes = (
    shapes: State['shapes'],
    hover: Hover | null,
    selectedShapes: string[],
    update: PendingStateUpdate,
    pending: PendingState['pending'],
): RenderItem[] => {
    return Object.entries(shapes).flatMap(([key, shape]) =>
        renderShape(key, shape, hover, selectedShapes, pending, update),
    );
};

export const DeferredRender = ({
    setWarnings,
    worker,
    state,
    t,
    zoomProps,
    size,
    onFPS,
}: {
    setWarnings(v: string[]): void;
    size: number;
    t: number;
    state: State;
    worker: WorkerSend;
    zoomProps: ZoomProps;
    onFPS: (v: number) => void;
}) => {
    const [mouse, setMouse] = useState(null as null | Coord);

    const editContext = useEditState();
    const hover = editContext.use((v) => v.hover);
    const eShowShapes = editContext.use((v) => v.showShapes);

    const [remoteData, setRemoteData] = useState<null | {
        bg: Color | null;
        items: RenderItem[];
        keyPoints: ([Coord, Coord] | Coord)[];
        byKey: Record<string, string[]>;
    }>(null);

    const bouncy = useRef<boolean | MessageToWorker>(false);

    useEffect(() => {
        const msg: MessageToWorker = {type: 'frame', state, t};
        if (bouncy.current) {
            bouncy.current = msg;
            return;
        }

        let start = Date.now();
        const got = (res: MessageResponse) => {
            if (res.type !== 'frame') return;
            onFPS(1000 / (Date.now() - start));
            setRemoteData(res);
            setWarnings(res.warnings);
            if (bouncy.current && typeof bouncy.current === 'object') {
                const msg = bouncy.current;
                bouncy.current = true;
                start = Date.now();
                worker(msg, got);
            } else {
                bouncy.current = false;
            }
        };

        bouncy.current = true;
        worker(msg, got);
    }, [state, t, worker, setWarnings, onFPS]);

    const pendingState = usePendingState();
    const pending = pendingState.use((v) => v.pending);
    const selectedShapes = pending?.type === 'select-shapes' ? pending.shapes : [];

    const showShapes =
        eShowShapes || pending?.type === 'select-shapes' || pending?.type === 'select-shape';

    const shapesItems = useMemo((): RenderItem[] => {
        if (!showShapes && !hover) return [];
        let expanded = expandShapes(state.shapes, state.layers);
        if (!showShapes && hover) {
            expanded = Object.fromEntries(
                Object.entries(expanded).filter(([k, v]) =>
                    hover.type === 'shape' ? k === hover.id : hover.ids.includes(k),
                ),
            );
        }

        return renderShapes(expanded, hover, selectedShapes, pendingState.update, pending).sort(
            (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
        );
    }, [
        showShapes,
        state.shapes,
        state.layers,
        hover,
        selectedShapes,
        pendingState.update,
        pending,
    ]);

    const both = useMemo(
        () => (remoteData?.items ? [...remoteData.items, ...shapesItems] : []),
        [remoteData?.items, shapesItems],
    );
    if (!remoteData) return <div>Loading..</div>;

    if (pending) {
        return (
            <SVGCanvas
                zoomProps={zoomProps}
                state={state}
                mouse={mouse}
                keyPoints={remoteData.keyPoints}
                setMouse={setMouse}
                items={both}
                size={size}
                byKey={remoteData.byKey}
                bg={remoteData.bg}
            />
        );
    }

    return (
        <Canvas
            zoomProps={zoomProps}
            state={state}
            mouse={mouse}
            setMouse={setMouse}
            items={both}
            size={size}
            byKey={remoteData.byKey}
            bg={remoteData.bg}
            t={t}
        />
    );
};
