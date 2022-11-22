// Basic ... ideas ...

// import { MantineProvider } from '@mantine/core';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadInitialState } from './state/persistence';
import 'primereact/resources/themes/bootstrap4-dark-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

const root = createRoot(document.getElementById('root')!);

loadInitialState().then((state) =>
    root.render(
        // <MantineProvider
        //     theme={{ colorScheme: 'dark' }}
        //     withGlobalStyles
        //     withNormalizeCSS
        // >
        <App initialState={state} />,
        // </MantineProvider>,
    ),
);
