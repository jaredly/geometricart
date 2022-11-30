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
import { Mirror, State } from './types';
import { Accordion } from './sidebar/Accordion';
import { MirrorPicker } from './MirrorPicker';
import { setupState } from './setupState';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { exportPNG } from './editor/Export';
import { Button } from 'primereact/button';
import { confirmPopup, ConfirmPopup } from 'primereact/confirmpopup';
dayjs.extend(relativeTime);

const metaPrefix = 'meta:';
const keyPrefix = 'geometric-art-';
const thumbPrefix = 'thumb:';
const key = (id: string) => keyPrefix + id;
const meta = (id: string) => metaPrefix + key(id);

export const updateMeta = async (id: string, update: Partial<MetaData>) => {
    const current = await localforage.getItem<MetaData>(meta(id));
    return localforage.setItem(meta(id), { ...current, ...update });
};

export const newState = async (mirror: Mirror | null) => {
    const state = setupState(mirror);
    const id = genid();
    localforage.setItem<MetaData>(metaPrefix + key(id), {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        openedAt: Date.now(),
        size: JSON.stringify(state).length,
    });
    exportPNG(400, state, 1000, false, false, 0).then((blob) => {
        localforage.setItem(thumbPrefix + key(id), blob);
    });
    return localforage.setItem(key(id), state).then(() => id);
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

type MetaData = {
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
                                    onClick={(mirror) => {
                                        newState(mirror).then((id) => {
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
            .then((metas) =>
                setDesigns(
                    (metas.filter(Boolean) as MetaData[]).sort(
                        (a, b) => b.updatedAt - a.updatedAt,
                    ),
                ),
            );
    }, []);
    const [tick, setTick] = React.useState(0);
    React.useEffect(() => {
        const iv = setInterval(() => setTick(tick + 1), 1000 * 60);
        return () => clearInterval(iv);
    });
    return (
        <div className="flex flex-row flex-wrap p-3">
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
                        <ThumbLoader id={design.id} />
                        <div>{dayjs(design.updatedAt).from(dayjs())}</div>
                        <div className="flex flex-row justify-content-between">
                            {mb(design.size)}
                            <div>
                                {/* <Button
                                    onClick={(evt) => {
                                        evt.stopPropagation();
                                    }}
                                    icon="pi pi-download"
                                    className="p-button-sm p-button-text"
                                    style={{ marginTop: -5, marginBottom: -6 }}
                                /> */}
                                <Button
                                    onClick={(evt) => {
                                        evt.stopPropagation();
                                        const popup = confirmPopup({
                                            target: evt.currentTarget,
                                            message:
                                                'Are you sure you want to delete this design?',
                                            icon: 'pi pi-exclamation-triangle',
                                            accept: () => {
                                                setDesigns(
                                                    designs.filter(
                                                        (d) =>
                                                            d.id !== design.id,
                                                    ),
                                                );
                                                localforage.removeItem(
                                                    key(design.id),
                                                );
                                                localforage.removeItem(
                                                    meta(design.id),
                                                );
                                                localforage.removeItem(
                                                    thumbPrefix +
                                                        key(design.id),
                                                );
                                            },
                                            reject: () => {},
                                        });
                                        console.log(popup);
                                        popup.show();
                                    }}
                                    icon="pi pi-trash"
                                    className=" p-button-sm p-button-text p-button-danger"
                                    style={{ marginTop: -5, marginBottom: -6 }}
                                />
                            </div>
                        </div>
                    </div>
                    <div></div>
                </div>
            ))}
            <ConfirmPopup />
        </div>
    );
};

const ThumbLoader = ({ id }: { id: string }) => {
    const [data, setData] = React.useState(null as null | string);
    React.useEffect(() => {
        localforage
            .getItem<Blob>(thumbPrefix + key(id))
            .then((blob) => (blob ? setData(URL.createObjectURL(blob)) : null));
    }, [id]);
    return data ? <img src={data} width={200} height={200} /> : null;
};

const mb = (n: number) =>
    n > 1024 * 1024
        ? (n / 1024 / 1024).toFixed(2) + 'mb'
        : (n / 1024).toFixed(0) + 'kb';

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
