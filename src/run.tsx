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
import { Mirror, State } from './types';
import { Accordion } from './sidebar/Accordion';
import { MirrorPicker, SaveDest } from './MirrorPicker';
import { setupState } from './setupState';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { exportPNG } from './editor/Export';
import { DesignLoader } from './DesignLoader';
import { Button } from 'primereact/button';
import { useGists, gistCache } from './useGists';
import { newGist } from './gists';
dayjs.extend(relativeTime);

export const metaPrefix = 'meta:';
export const keyPrefix = 'geometric-art-';
export const thumbPrefix = 'thumb:';
export const key = (id: string) => keyPrefix + id;
export const meta = (id: string) => metaPrefix + key(id);

export const updateMeta = async (id: string, update: Partial<MetaData>) => {
    const current = await localforage.getItem<MetaData>(meta(id));
    return localforage.setItem(meta(id), { ...current, ...update });
};

type GistFiles = {
    'preview.png': { content: string };
    'state.json': { content: string };
    // snapshot .png's, or .nc's, or .svg's can go here
};

const blobToString = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsBinaryString(blob);
    });

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

export const saveState = async (state: State, id: string) => {
    localforage.setItem(key(id), state);
    updateMeta(id, {
        updatedAt: Date.now(),
        size: JSON.stringify(state).length,
    });
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    localforage.setItem(thumbPrefix + key(id), blob);
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
                href={`https://github.com/login/oauth/authorize?state=http://127.0.0.1:5173&client_id=ba94f2f91d600ee580be&redirect_uri=https://geometric-art-login.jaredly.workers.dev/&scope=gist`}
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
            {gists.map((gist) => (
                <div className="mt-3">
                    {gist.description || '[no description]'} : {gist.url}
                    <div
                        className="m-3"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'max-content max-content',
                            // gridTemplateColumns:
                            //     'repeat(auto-fill, minmax(200px, 1fr))',
                        }}
                    >
                        {Object.keys(gist.files).map((name) => (
                            <div style={{ display: 'contents' }}>
                                <span className="p-1">{name}</span>
                                <span className="p-1">
                                    {gist.files[name].size}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const File = () => {
    const data = useLoaderData();
    const params = useParams();
    if (!data) {
        return <div>No loaded data?</div>;
    }
    return <App initialState={data as State} id={params.id!} />;
};

/* then we can do useOutletContext() for state & dispatch ... is that it? */
const router = createHashRouter(
    createRoutesFromElements([
        <Route index element={<Welcome />} />,
        <Route
            path=":id"
            element={<File />}
            loader={({ params }) => localforage.getItem(key(params.id!))}
        />,
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
