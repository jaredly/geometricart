import {useEffect, useMemo, useRef, useState} from 'react';
import {Coord} from '../../../types';
import {PendingState, PendingStateUpdate, useEditState, usePendingState} from './editState';
import {Patterns, RenderItem} from './evaluate';
import {Color, State} from './export-types';
import {WorkerSend} from './render-client';
import {MessageResponse, MessageToWorker} from './render-worker';
import {renderShape} from './RenderExport';
import {Hover} from './resolveMods';
import {Canvas, SVGCanvas} from './SVGCanvas';
import {ZoomProps} from './useSVGZoom';
import {expandShapes} from './expandShapes';

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
    patterns,
    t,
    zoomProps,
    size,
    onFPS,
}: {
    setWarnings(v: string[]): void;
    size: number;
    t: number;
    state: State;
    patterns: Patterns;
    worker: WorkerSend;
    zoomProps: ZoomProps;
    onFPS: (v: number) => void;
}) => {
    const [mouse, setMouse] = useState(null as null | Coord);

    const editContext = useEditState();
    const hover = editContext.use((v) => v.hover);
    const eShowShapes = editContext.use((v) => v.showShapes);

    const [remoteData, setRemoteData] = useState<null | {
        bg: Color;
        items: RenderItem[];
        keyPoints: [Coord, Coord][];
        byKey: Record<string, string[]>;
    }>(null);

    const bouncy = useRef<boolean | MessageToWorker>(false);

    useEffect(() => {
        const msg: MessageToWorker = {type: 'frame', patterns, state, t};
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
    }, [state, patterns, t, worker, setWarnings, onFPS]);

    const pendingState = usePendingState();
    const pending = pendingState.use((v) => v.pending);
    const selectedShapes = pending?.type === 'select-shapes' ? pending.shapes : [];

    const showShapes =
        eShowShapes || pending?.type === 'select-shapes' || pending?.type === 'select-shape';

    const shapesItems = useMemo(
        (): RenderItem[] =>
            showShapes
                ? renderShapes(
                      expandShapes(state.shapes, state.layers, patterns),
                      hover,
                      selectedShapes,
                      pendingState.update,
                      pending,
                  )
                : [],
        [
            showShapes,
            state.shapes,
            state.layers,
            hover,
            selectedShapes,
            pendingState.update,
            pending,
            patterns,
        ],
    );

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
            // keyPoints={keyPoints}
            setMouse={setMouse}
            items={both}
            size={size}
            byKey={remoteData.byKey}
            bg={remoteData.bg}
            t={t}
        />
    );
};
