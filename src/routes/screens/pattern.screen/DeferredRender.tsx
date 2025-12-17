import {RefObject, useState, useRef, useEffect, useMemo} from 'react';
import {Coord} from '../../../types';
import {PendingStateUpdate, PendingState, useEditState, usePendingState} from './editState';
import {RenderItem, Patterns} from './evaluate';
import {State, Box, Color} from './export-types';
import {WorkerSend} from './render-client';
import {MessageToWorker, MessageResponse} from './render-worker';
import {renderShape} from './RenderExport';
import {Hover} from './resolveMods';
import {Canvas} from './SVGCanvas';
import {ZoomProps} from './useSVGZoom';

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
}: {
    setWarnings(v: string[]): void;
    size: number;
    t: number;
    state: State;
    patterns: Patterns;
    worker: WorkerSend;
    zoomProps: ZoomProps;
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

        const got = (res: MessageResponse) => {
            if (res.type !== 'frame') return;
            setRemoteData(res);
            setWarnings(res.warnings);
            if (bouncy.current && typeof bouncy.current === 'object') {
                const msg = bouncy.current;
                bouncy.current = true;
                worker(msg, got);
            } else {
                bouncy.current = false;
            }
        };

        bouncy.current = true;
        worker(msg, got);
    }, [state, patterns, t, worker, setWarnings]);

    const pendingState = usePendingState();
    const pending = pendingState.use((v) => v.pending);
    const selectedShapes = pending?.type === 'select-shapes' ? pending.shapes : [];

    const showShapes =
        eShowShapes || pending?.type === 'select-shapes' || pending?.type === 'select-shape';

    const shapesItems = useMemo(
        (): RenderItem[] =>
            showShapes
                ? renderShapes(state.shapes, hover, selectedShapes, pendingState.update, pending)
                : [],
        [showShapes, state.shapes, hover, selectedShapes, pendingState.update, pending],
    );

    const both = useMemo(
        () => (remoteData?.items ? [...remoteData.items, ...shapesItems] : []),
        [remoteData?.items, shapesItems],
    );
    if (!remoteData) return <div>Loading..</div>;

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
