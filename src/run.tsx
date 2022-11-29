// Basic ... ideas ...

// import { MantineProvider } from '@mantine/core';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
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
} from 'react-router-dom';
import localforage from 'localforage';

const root = createRoot(document.getElementById('root')!);

const key = (id: string) => `geometric-art-${id}`;

/* then we can do useOutletContext() for state & dispatch ... is that it? */
// const router = createBrowserRouter(
//     createRoutesFromElements([
//         <Route index element={<NewFile />} />,
//         <Route
//             path=":id"
//             element={<File />}
//             loader={({ params }) => localforage.getItem(key(params.id!))}
//         >
//             <Route index element={<EditorScreen />} />
//             <Route path="cnc" element={<CNCScreen />} />
//             <Route path="animate" element={<AnimateScreen />} />
//             <Route path="replay" element={<ReplayScreen />} />
//         </Route>,
//     ]),
// );

loadInitialState().then((state) =>
    root.render(
        // <MantineProvider
        //     theme={{ colorScheme: 'dark' }}
        //     withGlobalStyles
        //     withNormalizeCSS
        // >
        // <HashRouter>
        <App initialState={state} />,
        // </HashRouter>
        // </MantineProvider>,
    ),
);
