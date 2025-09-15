// Basic ... ideas ...

// import { MantineProvider } from '@mantine/core';
import './polyfill';
import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import {App} from './App';
import 'primereact/resources/themes/bootstrap4-dark-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import {
    Route,
    createRoutesFromElements,
    RouterProvider,
    useLoaderData,
    createHashRouter,
    useParams,
} from 'react-router-dom';
import localforage from 'localforage';
import {Checkpoint, Meta, Mirror, State, Tiling} from './types';
import {Accordion} from './sidebar/Accordion';
import {MirrorPicker, SaveDest} from './MirrorPicker';
import {setupState} from './setupState';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {exportPNG} from './editor/ExportPng';
import {DesignLoader} from './DesignLoader';
import {Button} from 'primereact/button';
import {useGists, gistCache} from './useGists';
import {loadGist, newGist, saveGist, stateFileName} from './gists';
import {maybeMigrate} from './state/migrateState';
import {initialState} from './state/initialState';
import {Morph} from './Morph';
import {useDropStateTarget} from './editor/useDropTarget';
import {usePK, WithPathKit} from './editor/pk';
dayjs.extend(relativeTime);

export const metaPrefix = 'meta:';
export const keyPrefix = 'geometric-art-';
export const thumbPrefix = 'thumb:';
export const snapshotPrefix = 'snapshot:';
export const key = (id: string) => keyPrefix + id;
export const meta = (id: string) => metaPrefix + key(id);
export const snapshotKey = (id: string, checkpoint: Checkpoint) =>
    snapshotPrefix + key(id) + ':' + checkpointToString(checkpoint);

export const updateMeta = async (
    id: string,
    update: Partial<MetaData> | ((v: MetaData) => Partial<MetaData>),
) => {
    const current = await localforage.getItem<MetaData>(meta(id));
    if (!current) {
        return;
    }
    return localforage.setItem(meta(id), {
        ...current,
        ...(typeof update === 'function' ? update(current) : update),
    });
};

export const newState = async (state: State, dest: SaveDest) => {
    // if (!state) {
    //     state = setupState(mirror);
    // }
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    if (dest.type === 'local') {
        const id = genid();
        localforage.setItem(thumbPrefix + key(id), blob);
        localforage.setItem<MetaData>(metaPrefix + key(id), newMetaData(id, state));
        return localforage.setItem(key(id), state).then(() => '/' + id);
    } else {
        return newGist(state, blob, dest.token).then((id) => '/gist/' + id);
    }
};

export const addSnapshot = async (id: string, state: State) => {
    const checkpoint: Checkpoint = {
        branchId: state.history.currentBranch,
        undo: state.history.undo,
        branchLength: state.history.branches[state.history.currentBranch].items.length,
    };
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    updateMeta(id, (meta) => ({
        checkpoints: [...(meta.checkpoints || []), checkpoint],
    }));
    localforage.setItem(snapshotKey(id, checkpoint), blob);
};

export const saveState = async (state: State, id: string, dest: SaveDest) => {
    const blob = await exportPNG(
        400,
        {...state, view: {...state.view, guides: false}},
        1000,
        false,
        false,
        0,
    );
    if (dest.type === 'local') {
        localforage.setItem(key(id), state);
        updateMeta(id, {
            updatedAt: Date.now(),
            size: JSON.stringify(state).length,
            tilings: Object.values(state.tilings),
        });
        localforage.setItem(thumbPrefix + key(id), blob);
    } else {
        return await saveGist(id, state, blob, dest.token);
    }
};

export const range = (start: number, end: number) => {
    const result = [];
    for (let i = start; i < end; i++) {
        result.push(i);
    }
    return result;
};

const genid = () => Math.random().toString(36).substring(2, 15);

export type MetaData = {
    createdAt: number;
    updatedAt: number;
    openedAt: number;
    id: string;
    size: number;
    tilings: Tiling[];
    checkpoints?: Array<Checkpoint>;
};

export const checkpointToString = (c: Checkpoint) => `${c.branchId}-${c.branchLength}-${c.undo}`;
export const stringToCheckpoint = (s: string) => {
    const [branchId, branchLength, undo] = s.split('-');
    return {
        branchId: parseInt(branchId),
        branchLength: parseInt(branchLength),
        undo: parseInt(undo),
    };
};

const Welcome = () => {
    const [activeIds, setActiveIds] = React.useState({
        new: false,
        open: true,
        gists: true,
    } as {
        [key: string]: boolean;
    });
    const [dragging, callbacks] = useDropStateTarget((state) => {
        // ok
        if (state) {
            newState(state, {type: 'local'}).then((id) => {
                window.location.hash = id;
            });
        }
    });
    return (
        <div
            className="flex flex-column justify-content-center align-items-center"
            {...callbacks}
            style={dragging ? {background: 'teal'} : {}}
        >
            <div style={{width: 900, padding: 24}}>
                <Accordion
                    activeIds={activeIds}
                    setActiveIds={setActiveIds}
                    tabs={[
                        {
                            key: 'new',
                            header: 'New Design',
                            content: () => (
                                <MirrorPicker
                                    onClick={(mirror, dest) => {
                                        newState(setupState(mirror), dest).then((id) => {
                                            window.location.hash = id;
                                        });
                                    }}
                                    githubToken={localStorage.github_access_token}
                                />
                            ),
                        },
                        {
                            key: 'open',
                            header: 'Open Design',
                            content: () => <DesignLoader />,
                        },
                        {
                            key: 'gists',
                            header: 'Github Gists',
                            content: () => <GistLoader />,
                        },
                    ]}
                />
            </div>
        </div>
    );
};

const GistLoader = () => {
    const {gists, token} = useGists();
    if (token == null) {
        return (
            <a
                href={`https://github.com/login/oauth/authorize?state=${location.protocol}//${location.host}&client_id=ba94f2f91d600ee580be&redirect_uri=https://geometric-art-login.jaredly.workers.dev/&scope=gist`}
                className="p-button p-button-primary m-5"
            >
                Authenticate with Github
            </a>
        );
    }
    if (gists == null) {
        return <div className="p-5">Loading...</div>;
    }
    return (
        <div className="p-3">
            <Button
                onClick={() => {
                    localforage.removeItem(gistCache);
                    localStorage.removeItem('github_access_token');
                    location.reload();
                }}
            >
                Logout of Github
            </Button>
            <Button
                onClick={() => {
                    localforage.removeItem(gistCache);
                    location.reload();
                }}
            >
                Refresh
            </Button>
            <div className="flex flex-row flex-wrap">
                {gists.map((gist) => (
                    <div
                        key={gist.id}
                        className="mt-3 flex flex-column hover:surface-hover surface-base p-4 cursor-pointer"
                        onClick={() => {
                            window.location.hash = '/gist/' + gist.id;
                        }}
                    >
                        <img
                            width={200}
                            height={200}
                            src={`https://gist.githubusercontent.com/${gist.user}/${gist.id}/raw/${gist.preview_sha}/preview.png`}
                        />
                        <div>
                            {dayjs(gist.updated).fromNow()}
                            <a
                                target="_blank"
                                href={`https://gist.github.com/${gist.id}`}
                                onClick={(evt) => evt.stopPropagation()}
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                }}
                                className="pi pi-external-link pi-button pi-button-text m-1"
                            ></a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const File = ({gist, dest}: {gist?: boolean; dest: SaveDest}) => {
    const data = useLoaderData();
    const params = useParams();

    const id = params.id!;

    const [lastSaved, setLastSaved] = React.useState({
        when: Date.now(),
        dirty: null as null | true | (() => void),
        id,
    });
    usePreventNavAway(lastSaved);

    if (!data) {
        return <div>No loaded data?</div>;
    }
    return (
        <App
            closeFile={() => (location.hash = '/')}
            initialState={data as State}
            lastSaved={dest.type === 'gist' ? lastSaved : null}
            saveState={(state) => {
                if (dest.type === 'gist') {
                    const force = debounce(() => {
                        setLastSaved((s) => ({...s, dirty: true}));
                        return saveState(state, id, dest).then(() => {
                            setLastSaved({when: Date.now(), dirty: null, id});
                        });
                    }, 10000);
                    setLastSaved((s) => ({...s, dirty: force}));
                } else {
                    saveState(state, id, dest);
                }
            }}
        />
    );
};

function usePreventNavAway(lastSaved: {
    when: number;
    dirty: true | (() => void) | null;
    id: string;
}) {
    React.useEffect(() => {
        if (lastSaved.dirty) {
            const fn = (evt: BeforeUnloadEvent) => {
                evt.preventDefault();
                evt.stopPropagation();
                return (evt.returnValue = 'Are you sure?');
            };
            window.addEventListener('beforeunload', fn, {capture: true});
            return () =>
                window.removeEventListener('beforeunload', fn, {
                    capture: true,
                });
        }
    }, [lastSaved.dirty]);
}

/**
 * Debounce a function.
 */
let tid: NodeJS.Timeout | null = null;
export const debounce = (fn: () => Promise<void>, time: number): (() => void) => {
    if (tid != null) {
        clearTimeout(tid);
    }
    tid = setTimeout(() => {
        tid = null;
        fn();
    }, time);
    return () => {
        if (tid != null) {
            clearTimeout(tid);
            tid = null;
            fn();
        }
    };
};

const PkDebug = () => {
    const PK = usePK();
    const [text, setText] = React.useState(
        `L10 10L5 0Z`,
        // `p.lineTo(10, 10)\np.conicTo(0, 0, 0, 10, 0.2)\np.close()`,
    );
    const d = React.useMemo(() => {
        try {
            const p = PK.FromSVGString(text);
            // const fn = new Function('p', text);
            // fn(p);
            const d = p.toSVGString();
            const cmds = p.toCmds();
            p.delete();
            return {d, cmds};
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [text]);
    return (
        <div>
            <textarea
                value={text}
                style={{width: 1000, height: 300}}
                onChange={(evt) => setText(evt.target.value)}
            />
            {d ? (
                <div>
                    <svg
                        style={{background: 'white', width: 400, height: 400}}
                        viewBox="-10 -10 50 50"
                    >
                        <path d={d.d} />
                    </svg>
                    <pre>{d.cmds.map((m) => JSON.stringify(m)).join('\n')}</pre>
                    <pre>{d.d.split(/(?=[MLQ])/g).join('\n')}</pre>
                </div>
            ) : (
                'Failed I guess'
            )}
        </div>
    );
};

/* then we can do useOutletContext() for state & dispatch ... is that it? */
const router = createHashRouter(
    createRoutesFromElements([
        <Route index element={<Welcome />} />,
        <Route
            path="gist/:id"
            element={
                <File
                    gist
                    dest={{
                        type: 'gist',
                        token: localStorage.github_access_token,
                    }}
                />
            }
            loader={({params}) =>
                loadGist(params.id!, localStorage.github_access_token).then((state) =>
                    maybeMigrate(state as State),
                )
            }
        />,
        <Route
            path=":id"
            element={<File dest={{type: 'local'}} />}
            loader={({params}) =>
                localforage.getItem(key(params.id!)).then((state) => maybeMigrate(state as State))
            }
        />,
        <Route path="pk" element={<PkDebug />} />,
    ]),
);

declare global {
    interface Window {
        _reactRoot: Root;
    }
}

type DATA = {
    App: typeof App;
    initialState: State;
    React: typeof React;
    createRoot: typeof createRoot;
    setupState: (mirror: Mirror | null) => unknown;
};

declare global {
    interface Window {
        GEOMETRICART_DATA: DATA;
        GEOMETRICART_INIT: () => unknown;
    }
}

const root = (window._reactRoot =
    window._reactRoot || createRoot(document.getElementById('root')!));

// if (window.GEOMETRICART_INIT) {
//     window.GEOMETRICART_DATA = {
//         App,
//         initialState,
//         React,
//         createRoot,
//         setupState,
//     };
//     window.GEOMETRICART_INIT();
// } else {

const params = new URLSearchParams(location.search);

const image = params.get('image');
const save = params.get('save');
const load = params.get('load');
const back = params.get('back');

const getForeignState = async (image: string | null, load: string | null) => {
    if (load) {
        try {
            const state: State = await (await fetch(load)).json();
            Object.values(state.attachments).forEach((att) => {
                console.log(att.contents);
                if (att.contents.startsWith('/')) {
                    att.contents = 'http://localhost:3000' + att.contents;
                }
            });
            return state;
        } catch (err) {
            // ignore I think
        }
    }
    if (image) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = image;
        await new Promise((res) => (img.onload = res));

        const state = setupState(null);
        state.attachments['pattern'] = {
            id: 'pattern',
            name: 'pattern',
            width: img.naturalWidth,
            height: img.naturalHeight,
            contents: image,
        };
        state.overlays['overlay'] = {
            id: 'overlay',
            source: 'pattern',
            scale: {x: 1, y: 1},
            center: {x: 0, y: 0},
            hide: false,
            over: false,
            opacity: 1,
        };
        state.selection = null;
        return state;
    }
    return setupState(null);
};
const morph = false;

if (morph) {
    root.render(
        <WithPathKit>
            <Morph />
        </WithPathKit>,
    );
} else if (save) {
    getForeignState(image, load).then(
        (state) => {
            root.render(
                <WithPathKit>
                    <App
                        closeFile={() => {
                            if (back) {
                                location.href = back;
                            } else {
                                history.back();
                            }
                        }}
                        initialState={state}
                        lastSaved={null}
                        saveState={async (state) => {
                            fetch(save, {
                                method: 'POST',
                                body: JSON.stringify(state),
                                headers: {
                                    'Content-type': 'application/json',
                                },
                            });
                        }}
                    />
                </WithPathKit>,
            );
        },
        (err) => {
            console.log(err);
            root.render(<h1>FAILED TO LOARD {err.message}</h1>);
        },
    );
} else {
    root.render(
        <WithPathKit>
            <RouterProvider router={router} />{' '}
        </WithPathKit>,
    );
}

function newMetaData(id: string, state: State): MetaData {
    return {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        openedAt: Date.now(),
        size: JSON.stringify(state).length,
        tilings: [],
    };
}
