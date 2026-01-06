import {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation} from 'react-router';
import {blankHistory} from '../../../json-diff/history';
import {Tiling} from '../../../types';
import type {Route} from './+types/pattern-export';
import {ExportHistory, ProvideExportState, useExportState} from './ExportHistory';
import {usePromise} from './hooks/usePromise';
import {Page} from './Page';
import {useWorker} from './render/render-client';
import {thinTiling} from './render/renderPattern';
import {RenderDebug} from './RenderDebug';
import {RenderExport} from './RenderExport';
import {StateEditor} from './state-editor/StateEditor';
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
import {ListExports} from './ListExports';
import {idbprefix, SnapshotUrl} from './state-editor/saveAnnotation';
import db from './state-editor/kv-idb';

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
                  .then((r) => r.json())
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
    }

    return <LoadPattern state={state.value.value} id={id} />;
};

// const loadLSUrl = (key: string) => {
//     return localStorage[key];
// };

const LoadPattern = ({id, state}: {id: string; state: ExportHistory}) => {
    const onSave = useCallback(
        async (state: ExportHistory) => {
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
        },
        [id],
    );

    const snapshotUrl = useMemo(
        (): SnapshotUrl =>
            id.startsWith(idbprefix)
                ? {type: 'idb', id: id.slice(idbprefix.length)}
                : {type: 'localhost', id},
        [id],
    );

    const bcr = [
        {title: 'Geometric Art', href: '/', dropdown: [{title: 'Gallery', href: '/gallery/'}]},
        {title: 'Export', href: '/export/'},
        {title: id, href: '/export/' + id},
    ];

    return (
        <Page breadcrumbs={bcr}>
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
    const [onLocal, setOnLocal] = useState<null | boolean>(false);
    // useEffect(() => {
    //     setOnLocal(window.location.hostname === 'localhost');
    // }, []);
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
    return (
        <ProvideExportState initial={initial} save={onSave}>
            <ProvidePendingState initial={initialPendingStateHistory}>
                <ProvideEditState initial={initialEditState}>
                    <Inner snapshotUrl={snapshotUrl} namePrefix={namePrefix} />
                </ProvideEditState>
            </ProvidePendingState>
        </ProvideExportState>
    );
};

const Inner = ({snapshotUrl, namePrefix}: {snapshotUrl: SnapshotUrl; namePrefix: string}) => {
    const sctx = useExportState();
    const state = sctx.use((v) => v);
    const pctx = usePendingState();
    const debug = location.search.includes('debug=');

    useEffect(() => {
        return sctx.onHistoryChange(() => {
            pctx.clearHistory();
        });
    }, [sctx, pctx]);

    useEffect(() => {
        const fn = (evt: KeyboardEvent) => {
            if (evt.metaKey && evt.key === 'z') {
                if (evt.shiftKey) {
                    if (sctx.canRedo()) {
                        sctx.redo();
                    } else {
                        pctx.redo();
                    }
                } else {
                    if (pctx.canUndo()) {
                        pctx.undo();
                    } else {
                        sctx.undo();
                    }
                }
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [sctx, pctx]);
    const worker = useWorker();

    return (
        <div className="flex">
            {debug ? (
                <RenderDebug state={state} update={sctx.update} />
            ) : (
                <RenderExport
                    worker={worker}
                    namePrefix={namePrefix}
                    snapshotUrl={snapshotUrl}
                    state={state}
                    onChange={sctx.update}
                />
            )}
            <div className="max-h-250 overflow-auto flex-1">
                <StateEditor
                    snapshotUrl={snapshotUrl}
                    value={state}
                    update={sctx.update}
                    worker={worker}
                />
            </div>
        </div>
    );
};
