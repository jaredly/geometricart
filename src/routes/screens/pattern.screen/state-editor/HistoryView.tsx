import {useCallback, useMemo, useState} from 'react';
import {addToMap} from '../../../shapesFromSegments';
import {useOnOpen} from '../../../useOnOpen';
import {useExportState, ExportHistory} from '../ExportHistory';

export const HistoryView = ({snapshotUrl}: {snapshotUrl: (id: string, ext: string) => string}) => {
    const ctx = useExportState();
    const history = ctx.useHistory();
    const [showDialog, setShowDialog] = useState(false);
    const dialogRef = useOnOpen(setShowDialog);

    const jump = useCallback((id: string) => ctx.dispatch({op: 'jump', id}), [ctx]);

    return (
        <div className="p-4">
            <button
                className="btn btn-sm btn-primary"
                onClick={(evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    dialogRef.current?.showModal();
                }}
            >
                Show History
            </button>
            <dialog id="history-modal" className="modal" ref={dialogRef}>
                {showDialog ? (
                    <HistoryViewDialog history={history} jump={jump} snapshotUrl={snapshotUrl} />
                ) : null}
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
};

type SizeInfo = {size: number; height: number; skipTo?: {id: string; count: number}};
const HistoryViewDialog = ({
    history,
    snapshotUrl,
    jump,
}: {
    jump: (id: string) => void;
    history: ExportHistory;
    snapshotUrl: (id: string, ext: string) => string;
}) => {
    // const ref = useRef<HTMLCanvasElement>(null);
    const {byParent, sizes} = useMemo(() => {
        const byParent: Record<string, string[]> = {};
        Object.values(history.nodes).forEach((node) => {
            if (node.pid === node.id) return;
            addToMap(byParent, node.pid, node.id);
        });
        const sizes: Record<string, SizeInfo> = {};
        const walk = (pid: string) => {
            let size = 0;
            let height = 1;
            let skipTo: undefined | {id: string; count: number};
            byParent[pid]?.forEach((id) => {
                walk(id);
                size += sizes[id].size;
                height = Math.max(height, 1 + sizes[id].height);
                if (sizes[id].skipTo && !history.annotations[id] && id !== history.tip) {
                    skipTo = {...sizes[id].skipTo};
                    skipTo.count++;
                } else {
                    skipTo = {id, count: 1};
                }
            });
            if (byParent[pid]?.length > 1) {
                skipTo = undefined;
            }
            sizes[pid] = {size: Math.max(1, size), height, skipTo};
        };
        walk(history.root);
        return {byParent, sizes};
    }, [history]);

    const nctx = useMemo(
        () => ({history, byParent, sizes, snapshotUrl, jump}),
        [history, byParent, sizes, snapshotUrl, jump],
    );

    return (
        <div className="modal-box flex flex-col w-11/12 max-w-full">
            <h3 className="font-bold text-lg">History</h3>
            <div className="overflow-auto p-5">
                <div style={{position: 'relative'}}>{renderNode(history.root, nctx)}</div>
            </div>
        </div>
    );
};

type NCtx = {
    history: ExportHistory;
    byParent: Record<string, string[]>;
    sizes: Record<string, SizeInfo>;
    snapshotUrl: (id: string, ext: string) => string;
    jump: (id: string) => void;
};

const renderNode = (id: string, ctx: NCtx) => {
    const oneHeight = 22;
    const {history, byParent, sizes, snapshotUrl, jump} = ctx;

    const self = (
        <div className="flex flex-row items-center">
            {id === history.root ? null : (
                <div
                    style={{
                        marginLeft: -10,
                        width: 10,
                        height: 4,
                        background: '#aaa',
                    }}
                />
            )}
            <button
                ref={(node) => {
                    if (id === history.tip && node) {
                        node.scrollIntoView();
                    }
                }}
                interestfor={`annotation-` + id}
                onClick={() => {
                    jump(id);
                }}
                style={{
                    // @ts-expect-error this is fine
                    anchorName: '--anchor-' + id,
                    zIndex: 5,
                    width: 20,
                    height: oneHeight - 4 * 2,
                    marginBlock: 4,
                    flexShrink: 0,
                    background: id === history.tip ? 'blue' : '#333',
                    border: '2px solid ' + (history.annotations[id] ? '#ff0' : '#aaa'),
                    borderRadius: 10,
                }}
            />
            <div
                popover={'auto'}
                className="dropdown card p-2 bg-base-100 border-base-300 border"
                // @ts-expect-error this is fine
                style={{positionAnchor: '--anchor-' + id}}
                id={`annotation-${id}`}
            >
                <div className="font-mono">{id}</div>
                {history.annotations[id]?.map((an, i) =>
                    an.type === 'img' ? (
                        <img key={i} src={snapshotUrl(an.id, 'png')} />
                    ) : (
                        <video key={i} src={snapshotUrl(an.id, 'mp4')} />
                    ),
                )}
            </div>
        </div>
    );
    if (!byParent[id]) {
        return self;
    }
    if (sizes[id].skipTo && sizes[id].skipTo.count > 5) {
        return (
            <div className="flex flex-row items-center">
                {self}
                <div
                    style={{
                        width: 20 * 3,
                        height: 4,
                        flex: 1,
                        background: '#aaa',
                    }}
                    className="flex items-center justify-center"
                >
                    <div className="bg-base-100 px-1 border-slate-50 border rounded-xl text-xs">
                        {sizes[id].skipTo.count}
                    </div>
                </div>
                {renderNode(sizes[id].skipTo.id, ctx)}
            </div>
        );
    }
    const children = byParent[id];
    const y0 = sizes[children[0]].size / 2;
    const y1 = sizes[children[children.length - 1]].size / 2;
    const lineHeight = sizes[id].size - y0 - y1;
    // sizes[id].size
    return (
        <div className="flex flex-row items-center">
            {self}
            <div
                style={{
                    height: oneHeight * sizes[id].size,
                    paddingTop: y0 * oneHeight,
                    marginLeft: -6,
                    marginRight: 6,
                }}
            >
                <div
                    style={{
                        height: oneHeight * lineHeight,
                        width: 4,
                        background: '#aaa',
                    }}
                ></div>
            </div>
            <div className="flex flex-col">{byParent[id].map((cid) => renderNode(cid, ctx))}</div>
        </div>
    );
};
