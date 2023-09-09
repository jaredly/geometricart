// Basic ... ideas ...

// import { MantineProvider } from '@mantine/core';
import './polyfill';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App } from './App';
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
import { Checkpoint, Meta, Mirror, State } from './types';
import { Accordion } from './sidebar/Accordion';
import { MirrorPicker, SaveDest } from './MirrorPicker';
import { setupState } from './setupState';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { exportPNG } from './editor/ExportPng';
import { DesignLoader } from './DesignLoader';
import { Button } from 'primereact/button';
import { useGists, gistCache } from './useGists';
import { loadGist, newGist, saveGist, stateFileName } from './gists';
import { maybeMigrate } from './state/migrateState';
import { PK } from './editor/pk';
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

export const newState = async (mirror: Mirror | null, dest: SaveDest) => {
    const state = setupState(mirror);
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    if (dest.type === 'local') {
        const id = genid();
        localforage.setItem(thumbPrefix + key(id), blob);
        localforage.setItem<MetaData>(
            metaPrefix + key(id),
            newMetaData(id, state),
        );
        return localforage.setItem(key(id), state).then(() => '/' + id);
    } else {
        return newGist(state, blob, dest.token).then((id) => '/gist/' + id);
    }
};

export const addSnapshot = async (id: string, state: State) => {
    const checkpoint: Checkpoint = {
        branchId: state.history.currentBranch,
        undo: state.history.undo,
        branchLength:
            state.history.branches[state.history.currentBranch].items.length,
    };
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    updateMeta(id, (meta) => ({
        checkpoints: [...(meta.checkpoints || []), checkpoint],
    }));
    localforage.setItem(snapshotKey(id, checkpoint), blob);
};

export const saveState = async (state: State, id: string, dest: SaveDest) => {
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    if (dest.type === 'local') {
        localforage.setItem(key(id), state);
        updateMeta(id, {
            updatedAt: Date.now(),
            size: JSON.stringify(state).length,
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
    checkpoints?: Array<Checkpoint>;
};

export const checkpointToString = (c: Checkpoint) =>
    `${c.branchId}-${c.branchLength}-${c.undo}`;
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
    return (
        <div className="flex flex-column justify-content-center align-items-center">
            <div style={{ width: 900, padding: 24 }}>
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
                                        newState(mirror, dest).then((id) => {
                                            window.location.hash = id;
                                        });
                                    }}
                                    githubToken={
                                        localStorage.github_access_token
                                    }
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
    const { gists, token } = useGists();
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

const File = ({ gist, dest }: { gist?: boolean; dest: SaveDest }) => {
    const data = useLoaderData();
    const params = useParams();
    if (!data) {
        return <div>No loaded data?</div>;
    }
    return <App initialState={data as State} id={params.id!} dest={dest} />;
};

const PkDebug = () => {
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
            return { d, cmds };
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [text]);
    return (
        <div>
            <textarea
                value={text}
                style={{ width: 1000, height: 300 }}
                onChange={(evt) => setText(evt.target.value)}
            />
            {d ? (
                <div>
                    <svg
                        style={{ background: 'white', width: 400, height: 400 }}
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
            loader={({ params }) =>
                loadGist(params.id!, localStorage.github_access_token).then(
                    (state) => maybeMigrate(state as State),
                )
            }
        />,
        <Route
            path=":id"
            element={<File dest={{ type: 'local' }} />}
            loader={({ params }) =>
                localforage
                    .getItem(key(params.id!))
                    .then((state) => maybeMigrate(state as State))
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

const root = (window._reactRoot =
    window._reactRoot || createRoot(document.getElementById('root')!));

root.render(<RouterProvider router={router} />);
function newMetaData(id: string, state: State): MetaData {
    return {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        openedAt: Date.now(),
        size: JSON.stringify(state).length,
    };
}
