import localforage from 'localforage';
import {State} from '../types';
import {initialState} from './initialState';
import {migrateState} from './migrateState';

const key = `geometric-art`;

const saveState = (state: State) => {
    localforage.setItem(key, JSON.stringify(state));
};

const loadInitialState = async () => {
    const data = await localforage.getItem(key);
    const state: State = data && typeof data === 'string' ? JSON.parse(data) : initialState;

    migrateState(state);

    return state;
};
