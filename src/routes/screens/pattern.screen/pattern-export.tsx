import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Tiling} from '../../../types';
import {ProvideEditState} from './editState';
// import {example} from './example';
import {ShapeStyle, State} from './export-types';
import {RenderExport} from './RenderExport';
import {StateEditor} from './state-editor/StateEditor';
import type {Route} from './+types/pattern-export';
import {useLocation} from 'react-router';
import {getNewPatternData} from '../../getPatternData';
import {sizeBox} from './useSVGZoom';
import {parseColor} from './colors';
import {genid} from './genid';
import {Patterns} from './evaluate';
import {unique} from '../../shapesFromSegments';
import {notNull} from './resolveMods';
import {RenderDebug} from './RenderDebug';
// import {example3} from './example3';

const usePromise = <T,>(f: (abort: AbortSignal) => Promise<T>, deps: any[] = []) => {
    const [v, setV] = useState<T | null>(null);
    const lv = useRef(f);
    lv.current = f;
    useEffect(() => {
        const ctrl = new AbortController();
        lv.current(ctrl.signal).then(setV);
        return () => ctrl.abort();
    }, deps);
    return v;
};

const PatternPicker = () => {
    const all = usePromise((signal) => fetch('/gallery.json', {signal}).then((r) => r.json()));
    return <div>Pick a pattern you cowards {all?.length}</div>;
};

const colorsRaw = '1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf';
export const colors: Array<string> = [];
for (let i = 0; i < colorsRaw.length; i += 6) {
    colors.push('#' + colorsRaw.slice(i, i + 6));
}

const makeForPattern = (tiling: Tiling, hash: string): State => {
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
                        tiling: hash,
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
            const state = makeForPattern(v, id);
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

const NewPattern = () => {
    const loc = useLocation();
    const params = new URLSearchParams(loc.search);
    const pattern = params.get('pattern');
    if (!pattern) {
        return <PatternPicker />;
    }
    return <CreateAndRedirect id={pattern} />;
};

const LoadPattern = ({id}: {id: string}) => {
    const state = usePromise<State>((signal) =>
        fetch(`/fs/exports/${id}.json`, {signal}).then((r) => r.json()),
    );

    const onSave = useCallback(
        (state: State) => {
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
                Object.values(state.layers)
                    .flatMap((l) =>
                        Object.values(l.entities).map((e) =>
                            e.type === 'Pattern' ? e.tiling : null,
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
            {/* <div role="tablist" className="tabs tabs-border">
                    {tabs.map((tap) =>
                        tap.enabled !== false ? (
                            <a
                                role="tab"
                                key={tap.name}
                                className={'tab' + (currentTab === tap.name ? ` tab-active` : '')}
                                href={tap.link}
                                onClick={
                                    tap.link
                                        ? undefined
                                        : () => {
                                              setCurrentTab(tap.name);
                                          }
                                }
                            >
                                {tap.name}
                            </a>
                        ) : null,
                    )}
                </div> */}
        </div>
        {children}
    </div>
);

export default function PatternExportScreen({params}: Route.ComponentProps) {
    if (params.id) {
        return <LoadPattern id={params.id} />;
    }
    return <NewPattern />;
}

const PatternExport = ({
    initial,
    onSave,
    initialPatterns,
}: {
    initial: State;
    onSave: (s: State) => void;
    initialPatterns: Patterns;
}) => {
    const [state, setState] = useState<State>(initial);

    useEffect(() => {
        if (state !== initial) {
            console.log('saving', state);
            onSave(state);
        }
    }, [state, initial, onSave]);

    const patternCache = useMemo<Patterns>(() => initialPatterns, [initialPatterns]);

    // biome-ignore lint/correctness/useExhaustiveDependencies : this is for hot refresh
    // useEffect(() => {
    //     setState(example3);
    // }, [example3, id]);

    // const patterns = useMemo(() => ({[id]: tiling}), [id, tiling]);

    return (
        <ProvideEditState>
            <div className="flex">
                <RenderExport state={state} patterns={patternCache} />
                {/* <RenderDebug state={state} patterns={patternCache} /> */}
                <div className="max-h-250 overflow-auto flex-1">
                    <StateEditor value={state} onChange={setState} />
                </div>
            </div>
        </ProvideEditState>
    );
};
