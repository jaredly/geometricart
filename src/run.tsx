// Basic ... ideas ...

import localforage from 'localforage';
import * as React from 'react';
import { render } from 'react-dom';
import { App, key } from './App';
import { initialState } from './state/initialState';
import { State } from './types';
import { migrateState } from './state/migrateState';

localforage.getItem(key).then((data) => {
    const state: State =
        data && typeof data === 'string' ? JSON.parse(data) : initialState;

    migrateState(state);

    render(<App initialState={state} />, document.getElementById('root'));
});
