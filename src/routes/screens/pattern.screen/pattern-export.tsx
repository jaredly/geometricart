import {useCallback, useEffect, useMemo, useState} from 'react';
import {ThinTiling, Tiling} from '../../../types';
import {
    EditState,
    PendingState,
    ProvideEditState,
    ProvidePendingState,
    useEditState,
    usePendingState,
} from './editState';
// import {example} from './example';
import {ShapeStyle} from './export-types';
import {State} from './types/state-type';
import {RenderExport} from './RenderExport';
import {StateEditor} from './state-editor/StateEditor';
import type {Route} from './+types/pattern-export';
import {useLocation, useParams} from 'react-router';
import {getNewPatternData} from '../../getPatternData';
import {sizeBox} from './useSVGZoom';
import {parseColor} from './colors';
import {genid} from './genid';
import {Patterns} from './evaluate';
import {RenderDebug} from './RenderDebug';
import {blankHistory} from '../../../json-diff/history';
import {makeContext} from '../../../json-diff/react';
import {usePromise} from './usePromise';
import {thinTiling} from './renderPattern';
import {ExportHistory, ProvideExportState, useExportState} from './ExportHistory';
import {useWorker} from './render-client';
import typia from 'typia';
import {loadState} from './types/load-state';
import {useInitialPatterns} from './useInitialPatterns';
import {Page} from './Page';

const PatternPicker = () => {
    const all = usePromise((signal) => fetch('/gallery.json', {signal}).then((r) => r.json()));
    if (all?.type === 'err') {
        return <div>No bueno</div>;
    }
    return <div>Pick a pattern you cowards {all?.value.length} options</div>;
};

const colorsRaw = '1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf';
export const colors: Array<string> = [];
for (let i = 0; i < colorsRaw.length; i += 6) {
    colors.push('#' + colorsRaw.slice(i, i + 6));
}

const makeForPattern = (tiling: ThinTiling, hash: string): State => {
    const pd = getNewPatternData(tiling);
    const styles: Record<string, ShapeStyle> = {};
    for (let i = 0; i <= pd.colorInfo.maxColor; i++) {
        styles[`alt-${i}`] = {
            id: `alt-${i}`,
            fills: {
                [`fill-${i}`]: {
                    id: `fill-${i}`,
                    mods: [],
                    color: i,
                },
            },
            lines: {},
            kind: {type: 'alternating', index: i},
            mods: [],
            order: i,
        };
    }
    return {
        shapes: {},
        layers: {
            root: {
                id: 'root',
                rootGroup: 'root-group',
                entities: {
                    'root-group': {
                        type: 'Group',
                        id: 'root-group',
                        entities: {'one-pattern': 0},
                    },
                    'one-pattern': {
                        type: 'Pattern',
                        adjustments: {},
                        id: 'one-pattern',
                        mods: [],
                        psize: 3,
                        contents: {type: 'shapes', styles},
                        tiling: {id: hash, tiling},
                    },
                },
                guides: [],
                opacity: 1,
                order: 0,
                shared: {},
            },
        },
        crops: {},
        styleConfig: {
            seed: 0,
            palette: colors.map((color) => parseColor(color)!),
            timeline: {ts: [], lanes: []},
        },
        view: {box: sizeBox(3), ppi: 1},
    };
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
        fetch(`/fs/exports/${id}.json`, {signal})
            .then((r) => r.json())
            .then(loadState),
    );

    const bcr = [
        {title: 'Geometric Art', href: '/'},
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

const LoadPattern = ({id, state}: {id: string; state: ExportHistory}) => {
    const onSave = useCallback(
        (state: ExportHistory) => {
            return fetch(`/fs/exports/${id}.json`, {
                method: 'POST',
                body: JSON.stringify(state, null, 2),
                headers: {'Content-type': 'application/json'},
            });
        },
        [id],
    );

    const initialPatterns = useInitialPatterns(state);

    const bcr = [
        {title: 'Geometric Art', href: '/'},
        {title: 'Export', href: '/export/'},
        {title: id, href: '/export/' + id},
    ];

    if (!initialPatterns) {
        return (
            <Page breadcrumbs={bcr}>
                <div>Loading...</div>
            </Page>
        );
    }

    if (initialPatterns.type === 'err') {
        return (
            <Page breadcrumbs={bcr}>
                <div>Unable to load pattern defintions...</div>
            </Page>
        );
    }

    return (
        <Page breadcrumbs={bcr}>
            <PatternExport
                initial={state}
                onSave={onSave}
                initialPatterns={initialPatterns.value}
            />
        </Page>
    );
};

const ListExports = () => {
    const all = usePromise((signal) =>
        fetch('/fs/exports', {signal})
            .then((r) => r.json())
            .then((v: {name: string; created: number; modified: number}[]) => {
                const patterns: Record<
                    string,
                    {id: string; icon?: {id: string; created: number}; modified: number}
                > = {};
                v.forEach(({name, created, modified}) => {
                    if (name.endsWith('.json')) {
                        const id = name.slice(0, -'.json'.length);
                        if (!patterns[id]) {
                            patterns[id] = {id, modified};
                        } else {
                            patterns[id].modified = modified;
                        }
                    } else if (name.endsWith('.png')) {
                        const parts = name.slice(0, -'.png'.length).split('-');
                        const iid = parts.pop()!;
                        const id = parts.join('-');
                        if (!patterns[id]) {
                            patterns[id] = {id, modified: created, icon: {id: iid, created}};
                        } else if (!patterns[id].icon || patterns[id].icon.created < created) {
                            patterns[id].icon = {id: iid, created};
                        }
                    }
                });
                return Object.values(patterns).sort((a, b) => b.modified - a.modified);
            }),
    );
    if (!all) return 'Loading...';
    if (all.type === 'err') {
        return (
            <Page
                breadcrumbs={[
                    {title: 'Geometric Art', href: '/'},
                    {title: 'Exports', href: '/export/'},
                ]}
            >
                <div>Failed to load exports</div>
            </Page>
        );
    }
    return (
        <Page
            breadcrumbs={[
                {title: 'Geometric Art', href: '/'},
                {title: 'Exports', href: '/export/'},
            ]}
        >
            <div className="flex flex-row flex-wrap gap-4 p-4">
                {all.value.map(({id, icon}) => (
                    <div>
                        <a className="link" href={`/export/${id}`}>
                            {icon ? (
                                <img
                                    width={200}
                                    height={200}
                                    src={`/assets/exports/${id}-${icon.id}.png`}
                                />
                            ) : (
                                id
                            )}
                        </a>
                    </div>
                ))}
            </div>
        </Page>
    );
};

export default function PatternExportScreen({params}: Route.ComponentProps) {
    const loc = useLocation();
    const sparams = new URLSearchParams(loc.search);
    const pattern = sparams.get('pattern');

    if (params.id) {
        return <LoadAndMigratePattern id={params.id} />;
    }

    if (pattern) {
        return <CreateAndRedirect id={pattern} />;
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
    initialPatterns,
}: {
    initial: ExportHistory;
    onSave: (s: ExportHistory) => void;
    initialPatterns: Patterns;
}) => {
    return (
        <ProvideExportState initial={initial} save={onSave}>
            <ProvidePendingState initial={initialPendingStateHistory}>
                <ProvideEditState initial={initialEditState}>
                    <Inner initialPatterns={initialPatterns} />
                </ProvideEditState>
            </ProvidePendingState>
        </ProvideExportState>
    );
};

const Inner = ({initialPatterns}: {initialPatterns: Patterns}) => {
    const sctx = useExportState();
    const state = sctx.use((v) => v);
    const patternCache = useMemo<Patterns>(() => initialPatterns, [initialPatterns]);
    const pctx = usePendingState();
    const debug = location.search.includes('debug=');
    const params = useParams();

    const snapshotUrl = useCallback(
        (id: string, ext: string) => `/fs/exports/${params.id!}-${id}.${ext}`,
        [params],
    );

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
                <RenderDebug state={state} update={sctx.update} patterns={patternCache} />
            ) : (
                <RenderExport
                    worker={worker}
                    namePrefix={params.id!}
                    snapshotUrl={snapshotUrl}
                    state={state}
                    patterns={patternCache}
                    onChange={sctx.update}
                />
            )}
            <div className="max-h-250 overflow-auto flex-1">
                <StateEditor
                    snapshotUrl={snapshotUrl}
                    value={state}
                    patterns={patternCache}
                    update={sctx.update}
                    worker={worker}
                />
            </div>
        </div>
    );
};
