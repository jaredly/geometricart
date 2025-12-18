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
import {ShapeStyle, State} from './export-types';
import {RenderExport} from './RenderExport';
import {StateEditor} from './state-editor/StateEditor';
import type {Route} from './+types/pattern-export';
import {useLocation, useParams} from 'react-router';
import {getNewPatternData} from '../../getPatternData';
import {sizeBox} from './useSVGZoom';
import {parseColor} from './colors';
import {genid} from './genid';
import {Patterns} from './evaluate';
import {unique} from '../../shapesFromSegments';
import {notNull} from './resolveMods';
import {RenderDebug} from './RenderDebug';
import {blankHistory} from '../../../json-diff/history';
import {makeContext} from '../../../json-diff/react';
import {usePromise} from './usePromise';
import {thinTiling} from './renderPattern';
import {ExportHistory, ProvideExportState, useExportState} from './ExportHistory';
import {useWorker} from './render-client';

const PatternPicker = () => {
    const all = usePromise((signal) => fetch('/gallery.json', {signal}).then((r) => r.json()));
    return <div>Pick a pattern you cowards {all?.length} options</div>;
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

const LoadPattern = ({id}: {id: string}) => {
    const preNormalized = usePromise<State | ExportHistory>((signal) =>
        fetch(`/fs/exports/${id}.json`, {signal}).then((r) => r.json()),
    );
    const state = useMemo(
        () =>
            preNormalized && !('version' in preNormalized)
                ? blankHistory(preNormalized)
                : preNormalized,
        [preNormalized],
    );

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

    const initialPatterns = usePromise(
        async (signal) => {
            console.log('get pattern');
            if (!state) {
                console.log('no state');
                return null;
            }
            console.log('have state');
            const ids = unique(
                Object.values(state.current.layers)
                    .flatMap((l) =>
                        Object.values(l.entities).map((e) =>
                            e.type === 'Pattern' && typeof e.tiling === 'string' ? e.tiling : null,
                        ),
                    )
                    .filter(notNull),
                (x) => x,
            );
            const values = await Promise.all(
                ids.map((id) =>
                    fetch(`/gallery/pattern/${id}/json`, {signal}).then((r) => r.json()),
                ),
            );
            return Object.fromEntries(ids.map((id, i) => [id, values[i]]));
        },
        [state],
    );

    const bcr = [
        {title: 'Geometric Art', href: '/'},
        {title: 'Export', href: '/export/'},
        {title: id, href: '/export/' + id},
    ];

    if (!state || !initialPatterns)
        return (
            <Page breadcrumbs={bcr}>
                <div>Loading...</div>
            </Page>
        );

    return (
        <Page breadcrumbs={bcr}>
            <PatternExport initial={state} onSave={onSave} initialPatterns={initialPatterns} />
        </Page>
    );
};

const Page = ({
    children,
    breadcrumbs,
}: {
    children: React.ReactElement;
    breadcrumbs: {title: string; href: string}[];
}) => (
    <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
        <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200 flex justify-between">
            <div className="breadcrumbs text-sm">
                <ul>
                    {breadcrumbs.map((item, i) => (
                        <li key={i}>
                            <a href={item.href}>{item.title}</a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        {children}
    </div>
);

const ListExports = () => {
    const all = usePromise<string[]>((signal) =>
        fetch('/fs/exports', {signal}).then((r) => r.json()),
    );
    if (!all) return 'Loading...';
    return (
        <div>
            <h1>Exports</h1>
            <ul className="list">
                {all
                    .filter((n) => n.endsWith('.json'))
                    .map((name) => (
                        <li className="list-item">
                            <a className="link" href={`/export/${name.slice(0, -'.json'.length)}`}>
                                {name}
                            </a>
                        </li>
                    ))}
            </ul>
        </div>
    );
};

export default function PatternExportScreen({params}: Route.ComponentProps) {
    const loc = useLocation();
    const sparams = new URLSearchParams(loc.search);
    const pattern = sparams.get('pattern');

    if (params.id) {
        return <LoadPattern id={params.id} />;
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

const PatternExport = ({
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
                    id={params.id!}
                    state={state}
                    patterns={patternCache}
                    onChange={sctx.update}
                />
            )}
            <div className="max-h-250 overflow-auto flex-1">
                <StateEditor
                    id={params.id!}
                    value={state}
                    patterns={patternCache}
                    update={sctx.update}
                    worker={worker}
                />
            </div>
        </div>
    );
};
