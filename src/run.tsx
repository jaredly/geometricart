// Basic ... ideas ...

// import { MantineProvider } from '@mantine/core';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App } from './App';
import { loadInitialState } from './state/persistence';
import 'primereact/resources/themes/bootstrap4-dark-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import {
    HashRouter,
    Routes,
    Route,
    createBrowserRouter,
    createRoutesFromElements,
    RouterProvider,
    useLoaderData,
    createHashRouter,
    useParams,
} from 'react-router-dom';
import localforage from 'localforage';
import { State } from './types';
import { Accordion } from './sidebar/Accordion';
import { MirrorPicker } from './MirrorPicker';
import { setupState } from './setupState';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const metaPrefix = 'meta:';
const keyPrefix = 'geometric-art-';
const key = (id: string) => keyPrefix + id;
const meta = (id: string) => metaPrefix + key(id);

export const updateMeta = async (id: string, update: Partial<MetaData>) => {
    const current = await localforage.getItem<MetaData>(meta(id));
    return localforage.setItem(meta(id), { ...current, ...update });
};

export const saveState = (state: State, id: string) => {
    localforage.setItem(key(id), state);
    updateMeta(id, { updatedAt: Date.now() });
};

export const range = (start: number, end: number) => {
    const result = [];
    for (let i = start; i < end; i++) {
        result.push(i);
    }
    return result;
};

const genid = () => Math.random().toString(36).substring(2, 15);

type MetaData = {
    createdAt: number;
    updatedAt: number;
    openedAt: number;
    id: string;
};

const Welcome = () => {
    const [activeIds, setActiveIds] = React.useState({
        new: true,
        open: true,
    } as {
        [key: string]: boolean;
    });
    return (
        <div className="flex flex-column justify-content-center align-items-center">
            <div style={{ width: 800, padding: 24 }}>
                <Accordion
                    activeIds={activeIds}
                    setActiveIds={setActiveIds}
                    tabs={[
                        {
                            key: 'new',
                            header: 'New Design',
                            content: () => (
                                <MirrorPicker
                                    onClick={(mirror) => {
                                        const state = setupState(mirror);
                                        const id = genid();
                                        localforage.setItem<MetaData>(
                                            metaPrefix + key(id),
                                            {
                                                id,
                                                createdAt: Date.now(),
                                                updatedAt: Date.now(),
                                                openedAt: Date.now(),
                                            },
                                        );
                                        localforage
                                            .setItem(key(id), state)
                                            .then(() => {
                                                window.location.hash = '/' + id;
                                            });
                                    }}
                                />
                            ),
                        },
                        {
                            key: 'open',
                            header: 'Open Design',
                            content: () => <DesignLoader />,
                        },
                    ]}
                />
            </div>
        </div>
    );
};

const DesignLoader = () => {
    const [designs, setDesigns] = React.useState<MetaData[]>([]);
    React.useEffect(() => {
        localforage
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k.startsWith(keyPrefix))
                        .map((k) =>
                            localforage.getItem<MetaData>(metaPrefix + k),
                        ),
                ),
            )
            .then((metas) => setDesigns(metas.filter(Boolean) as MetaData[]));
    }, []);
    return (
        <div className="flex flex-row flex-wrap justify-content-center align-items-center">
            {designs.map((design) => (
                <div
                    key={design.id}
                    // style={{ width: 300, height: 300 }}
                    onClick={() => {
                        updateMeta(design.id, { openedAt: Date.now() }).then(
                            () => {
                                window.location.hash = '/' + design.id;
                            },
                        );
                    }}
                    className="hover:surface-hover surface-base p-4 cursor-pointer"
                >
                    <div style={{ flex: 1 }}>
                        <div>{dayjs(design.updatedAt).from(dayjs())}</div>
                    </div>
                    <div></div>
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
