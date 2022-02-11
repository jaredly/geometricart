// Basic ... ideas ...

import * as React from 'react';
import { render } from 'react-dom';
import { App } from './App';
import { loadInitialState } from './state/persistence';

loadInitialState().then((state) =>
    render(<App initialState={state} />, document.getElementById('root')),
);
