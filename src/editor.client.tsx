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
    useLoaderData,
    createHashRouter,
    useParams,
} from 'react-router-dom';
import localforage from 'localforage';
import {Checkpoint, Mirror, State, Tiling} from './types';
import {Accordion} from './sidebar/Accordion';
import {MirrorPicker} from './MirrorPicker';
import {SaveDest} from './SaveDest';
import {setupState} from './setupState';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {exportPNG} from './editor/ExportPng.exportPNG.related';
import {DesignLoader} from './DesignLoader';
import {Button} from 'primereact/button';
import {useGists, gistCache} from './useGists';
import {loadGist, newGist, saveGist} from './gists';
import {maybeMigrate} from './state/migrateState';
import {useDropStateTarget} from './editor/useDropTarget';
import {WithPathKit} from './editor/pk';
import {usePK} from './editor/pk.usePK.related';
import {key, newState, saveState, router} from './editor.client.metaPrefix.related';
import {debounce} from './editor.client.debounce.related';
dayjs.extend(relativeTime);










export const Welcome = () => {
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

export const File = ({gist, dest}: {gist?: boolean; dest: SaveDest}) => {
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

export const PkDebug = () => {
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

const morph = false;

export const AppWithSave = ({state, save}: {state: State; save: string}) => (
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
    </WithPathKit>
);

