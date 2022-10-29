// Basic ... ideas ...

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadInitialState } from './state/persistence';

const root = createRoot(document.getElementById('root')!);

loadInitialState().then((state) => root.render(<App initialState={state} />));
