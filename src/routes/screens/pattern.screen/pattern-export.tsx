import {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation} from 'react-router';
import {blankHistory} from '../../../json-diff/history';
import {useValue} from '../../../json-diff/react';
import {Tiling} from '../../../types';
import type {Route} from './+types/pattern-export';
import {ExportHistory, ProvideExportState, useExportState} from './ExportHistory';
import {usePromise} from './hooks/usePromise';
import {ListExports} from './ListExports';
import {Page} from './Page';
import {useWorker} from './render/render-client';
import {thinTiling} from './render/renderPattern';
import {RenderDebug} from './RenderDebug';
import {RenderExport} from './RenderExport';
import db from './state-editor/kv-idb';
import {idbprefix, SnapshotUrl} from './state-editor/saveAnnotation';
import {loadState} from './types/load-state';
import {
    EditState,
    PendingState,
    ProvideEditState,
    ProvidePendingState,
    usePendingState,
} from './utils/editState';
import {genid} from './utils/genid';
import {makeForPattern} from './utils/makeForPattern';
import {Sidebar} from './window/Sidebar';
import {
    initialWindowState,
    isWindowState,
    ProvideWindowState,
    useSafeLocalStorage,
    WindowState,
} from './window/state';
import {GlobalDependenciesCtx} from './window/GlobalDependencies';

const CreateAndRedirectLocalStorage = ({id}: {id: string}) => {
    const [error, setError] = useState<null | Error>(null);
    useEffect(() => {
        const controller = new AbortController();
        const ok = async () => {
            const v: Tiling = await fetch(`/gallery/pattern/${id}/json`).then((r) => r.json());
            const state = makeForPattern(thinTiling(v), id);
            const sid = genid();
            await db.transaction('readwrite', (tx) => {
                tx.set('exports', sid, blankHistory(state));
                tx.set('exportMeta', sid, {created: Date.now(), updated: Date.now()});
            });
            location.replace(`/export/${idbprefix}${sid}`);
        };
        ok().catch(setError);
        return () => controller.abort();
    }, [id]);
    if (error) {
        return <div>Unable to load pattern and create new document: {error.message}</div>;
    }
    return <div>Loading pattern...</div>;
};

const CreateAndRedirect = ({id}: {id: string}) => {
    const [error, setError] = useState<null | Error>(null);
    useEffect(() => {
        const controller = new AbortController();
        const ok = async () => {
            const v: Tiling = await fetch(`/gallery/pattern/${id}/json`).then((r) => r.json());
            const state = makeForPattern(thinTiling(v), id);
            const sid = genid();
            await fetch(`/fs/exports/${sid}.json`, {
                method: 'POST',
                body: JSON.stringify(state, null, 2),
                headers: {'Content-type': 'application/json'},
                signal: controller.signal,
            });
            location.replace(`/export/${sid}`);
        };
        ok().catch(setError);
        return () => controller.abort();
    }, [id]);
    if (error) {
        return <div>Unable to load pattern and create new document: {error.message}</div>;
    }
    return <div>Loading pattern...</div>;
};

const LoadAndMigratePattern = ({id}: {id: string}) => {
    const state = usePromise((signal) =>
        id.startsWith(idbprefix)
            ? db.get('exports', id.slice(idbprefix.length)).then(loadState)
            : fetch(`/fs/exports/${id}.json`, {signal})
                  .then((r) => (r.status === 200 ? r.json() : null))
                  .then(loadState),
    );

    const bcr = [
        {title: 'Geometric Art', href: '/', dropdown: [{title: 'Gallery', href: '/gallery/'}]},
        {title: 'Export', href: '/export/'},
        {title: id, href: '/export/' + id},
    ];

    if (!state) {
        return (
            <Page breadcrumbs={bcr}>
                <div>Loading...</div>
            </Page>
        );
    }

    if (state.type === 'err') {
        return (
            <Page breadcrumbs={bcr}>
                <div>Failed to load: {state.error.message}</div>
            </Page>
        );
    }

    if (state.value.version !== null) {
        // Show a dialog asking if the user wants to
        // a) edit it using an older version
        // b) migrate to the current version
        return (
            <div>
                <div id="my_modal_1" className="modal visible pointer-events-auto">
                    <div className="modal-box opacity-100">
                        <h3 className="font-bold text-lg">Document uses an old format</h3>
                        <p className="py-4">
                            You can use an older editor, or migrate it to the latest format.
                        </p>
                        <a
                            className="btn"
                            onClick={(evt) => {
                                evt.currentTarget.href = URL.createObjectURL(
                                    new Blob([JSON.stringify(state.value.value)], {
                                        type: 'application/json',
                                    }),
                                );
                            }}
                            download={`document-${id}.json`}
                        >
                            Download JSON
                        </a>
                        {!id.startsWith(idbprefix) ? (
                            <a
                                className="btn"
                                href={`http://localhost:5174/?src=http://localhost:5173/fs/exports/${id}.json`}
                            >
                                Use Older Version of the Editor
                            </a>
                        ) : null}
                        <button
                            className="btn"
                            onClick={() => {
                                if (state.value.version === 'unknown') {
                                    const migrated = makeForPattern(
                                        state.value.pattern,
                                        state.value.id,
                                    );
                                    savePattern(id, blankHistory(migrated)).then(() => {
                                        location.reload();
                                    });
                                }
                                // here we are
                            }}
                        >
                            Migrate from {state.value.version} to latest (will lose some history)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <LoadPattern state={state.value.value} id={id} />;
};

const savePattern = async (id: string, state: ExportHistory) => {
    if (id.startsWith(idbprefix)) {
        const lid = id.slice(idbprefix.length);
        await db.transaction('readwrite', (tx) => {
            tx.set('exports', lid, state);
            tx.update('exportMeta', lid, (meta) => ({...meta, updated: Date.now()}));
        });
        return;
    }
    return fetch(`/fs/exports/${id}.json`, {
        method: 'POST',
        body: JSON.stringify(state, null, 2),
        headers: {'Content-type': 'application/json'},
    });
};

const LoadPattern = ({id, state}: {id: string; state: ExportHistory}) => {
    const onSave = useCallback(async (state: ExportHistory) => savePattern(id, state), [id]);

    const snapshotUrl = useMemo(
        (): SnapshotUrl =>
            id.startsWith(idbprefix)
                ? {type: 'idb', id: id.slice(idbprefix.length)}
                : {type: 'localhost', id},
        [id],
    );
    console.log('toplevel');

    const bcr = [
        {title: 'Geometric Art', href: '/', dropdown: [{title: 'Gallery', href: '/gallery/'}]},
        {title: 'Export', href: '/export/'},
        {title: id, href: '/export/' + id},
    ];

    return (
        <Page breadcrumbs={bcr} fullWidth>
            <PatternExport
                initial={state}
                onSave={onSave}
                snapshotUrl={snapshotUrl}
                namePrefix={id}
            />
        </Page>
    );
};

/**
 * On localhost, we can use the `/fs/` api, but in prod we just use localStorage
 */
const CreateAndRedirectSwitch = ({id}: {id: string}) => {
    const [onLocal, setOnLocal] = useState<null | boolean>(null);
    useEffect(() => {
        setOnLocal(window.location.hostname === 'localhost');
    }, []);
    if (onLocal == null) return null;
    return onLocal ? <CreateAndRedirect id={id} /> : <CreateAndRedirectLocalStorage id={id} />;
};

export default function PatternExportScreen({params}: Route.ComponentProps) {
    const loc = useLocation();
    const sparams = new URLSearchParams(loc.search);
    const pattern = sparams.get('pattern');

    if (params.id) {
        return <LoadAndMigratePattern id={params.id} />;
    }

    if (pattern) {
        return <CreateAndRedirectSwitch id={pattern} />;
    }

    return <ListExports />;
}

const initialEditState: EditState = {
    hover: null,
    showShapes: false,
};
const initialPendingStateHistory = blankHistory<PendingState>({pending: null});

export const PatternExport = ({
    initial,
    onSave,
    snapshotUrl,
    namePrefix,
}: {
    initial: ExportHistory;
    onSave: (s: ExportHistory) => void;
    namePrefix: string;
    snapshotUrl: SnapshotUrl;
}) => {
    const [window, setWindow] = useSafeLocalStorage<WindowState>(
        'window-state',
        initialWindowState,
        isWindowState,
    );
    const worker = useWorker();
    const gctx = useMemo(() => ({worker, snapshotUrl}), [worker, snapshotUrl]);

    return (
        <GlobalDependenciesCtx.Provider value={gctx}>
            <ProvideExportState initial={initial} save={onSave}>
                <ProvidePendingState initial={initialPendingStateHistory}>
                    <ProvideEditState initial={initialEditState}>
                        <ProvideWindowState initial={window} save={setWindow}>
                            <Inner snapshotUrl={snapshotUrl} namePrefix={namePrefix} />
                        </ProvideWindowState>
                    </ProvideEditState>
                </ProvidePendingState>
            </ProvideExportState>
        </GlobalDependenciesCtx.Provider>
    );
};

const Inner = ({snapshotUrl, namePrefix}: {snapshotUrl: SnapshotUrl; namePrefix: string}) => {
    const sctx = useExportState();
    const state = useValue(sctx.$);
    const pctx = usePendingState();
    const {search} = useLocation();
    const debug = search.includes('debug=');

    useEffect(() => {
        return sctx.onHistoryChange(() => {
            pctx.clearHistory();
        });
    }, [sctx, pctx]);

    useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.metaKey && evt.key === 'z') {
                const t = evt.target;
                if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
                    return; // something is focused
                }
                if (evt.shiftKey) {
                    if (sctx.canRedo()) {
                        sctx.redo();
                    } else {
                        pctx.redo();
                    }
                    evt.preventDefault();
                    evt.stopImmediatePropagation();
                } else {
                    if (pctx.canUndo()) {
                        pctx.undo();
                    } else {
                        sctx.undo();
                    }
                    evt.preventDefault();
                    evt.stopImmediatePropagation();
                }
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [sctx, pctx]);

    return (
        <div className="flex">
            {debug ? (
                <RenderDebug state={state} update={sctx.$} />
            ) : (
                <RenderExport namePrefix={namePrefix} state={state} onChange={sctx.$} />
            )}
            {/*<div className="max-h-250 overflow-auto">
                <StateEditor
                    snapshotUrl={snapshotUrl}
                    value={state}
                    update={sctx.$}
                    worker={worker}
                />
            </div>*/}
            <Sidebar />
        </div>
    );
};
