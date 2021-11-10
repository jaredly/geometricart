// Basic ... ideas ...

import localforage from 'localforage';
import * as React from 'react';
import { render } from 'react-dom';
import { App, key } from './App';
import { initialState } from './initialState';
import { State } from './types';

localforage.getItem(key).then((data) => {
    const state: State =
        data && typeof data === 'string' ? JSON.parse(data) : initialState;

    if (!state.underlays) {
        state.underlays = {};
        state.attachments = {};
    }

    render(<App initialState={state} />, document.getElementById('root'));
});
