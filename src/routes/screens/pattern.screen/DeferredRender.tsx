import {useEffect, useMemo, useRef, useState} from 'react';
import {eigenShapeTransform} from '../../../editor/eigenShapeTransform';
import {applyTilingTransformsG, tilingPoints} from '../../../editor/tilingPoints';
import {isClockwise, reversePath} from '../../../rendering/pathToPoints';
import {transformBarePath} from '../../../rendering/points';
import {segmentKey} from '../../../rendering/segmentKey';
import {BarePath, Coord, Segment} from '../../../types';
import {simpleSize} from '../../getPatternData';
import {PendingState, PendingStateUpdate, useEditState, usePendingState} from './editState';
import {Patterns, RenderItem} from './evaluate';
import {Color, State} from './export-types';
import {WorkerSend} from './render-client';
import {MessageResponse, MessageToWorker} from './render-worker';
import {renderShape} from './RenderExport';
import {Hover} from './resolveMods';
import {Canvas, SVGCanvas} from './SVGCanvas';
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

const findPattern = (layers: State['layers'], id: string) => {
    for (let layer of Object.values(layers)) {
        for (let entity of Object.values(layer.entities)) {
            if (entity.type === 'Pattern' && entity.id === id) {
                return entity;
            }
        }
    }
};

const segmentsKey = (origin: Coord, segments: Segment[]) =>
    segments.map((seg, i) => segmentKey(i === 0 ? origin : segments[i - 1].to, seg)).join('-');

const barePathKey = (path: BarePath) => {
    if (!path.open) return segmentsKey(path.origin, path.segments);
    let segments = path.segments;
    if (!isClockwise(path.segments)) {
        segments = reversePath(path.segments);
    }
    const keys: string[] = [];
    for (let i = 0; i < path.segments.length; i++) {
        const items = [...path.segments.slice(i), ...path.segments.slice(0, i)];
        keys.push(segmentsKey(items[items.length - 1].to, items));
    }
    keys.sort();
    return keys[0];
};

const expandShapes = (shapes: State['shapes'], layers: State['layers'], patterns: Patterns) => {
    let changed = false;

    const usedKeys = Object.values(shapes).map(barePathKey);

    Object.entries(shapes).forEach(([key, value]) => {
        if (value.multiply == null) return;
        const pattern = findPattern(layers, value.multiply);
        if (!pattern) return;
        if (!changed) shapes = {...shapes};
        const shape =
            typeof pattern.tiling === 'string'
                ? patterns[pattern.tiling].shape
                : pattern.tiling.tiling.shape;
        const size = pattern.psize;

        const bounds = tilingPoints(shape);

        const ttt = eigenShapeTransform(
            shape,
            bounds[2],
            bounds,
            typeof size === 'number' ? simpleSize(shape, size) : size,
        );
        const transformedShapes = applyTilingTransformsG([value], ttt, transformBarePath);
        transformedShapes.forEach((shape, i) => {
            const k = barePathKey(shape);
            if (!usedKeys.includes(k)) {
                shapes[key + `:${i}`] = shape;
                usedKeys.push(k);
            }
        });
    });
    return shapes;
};
