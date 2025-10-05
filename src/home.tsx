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

// gallery

const Editor = () => {};

const Home = () => {
    return <div>Home</div>;
};

const topRoutes = createRoutesFromElements([
    <Route index element={<div>Home</div>} />,
    <Route path="gallery" element={<div>Home</div>} />,
    //
]);

const editorRoutes = createRoutesFromElements([
    //
]);

const topRouter = createHashRouter(
    createRoutesFromElements([
        <Route index key={0} element={<Home />} />,
        //
    ]),
);

const root = (window._reactRoot =
    window._reactRoot || createRoot(document.getElementById('root')!));

root.render(<RouterProvider router={router} />);
