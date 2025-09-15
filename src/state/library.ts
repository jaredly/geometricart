import localforage from 'localforage';
import {initialLibrary, Library} from '../types';

export const key = 'geometric-art:library';

export const migrateLibrary = (library: Library) => {
    // TODO
};

export const saveLibrary = (library: Library) => {
    localforage.setItem(key, JSON.stringify(library));
};

export const loadLibrary = async () => {
    const raw = await localforage.getItem(key);
    if (!raw || typeof raw !== 'string') {
        return initialLibrary;
    }
    try {
        const data = JSON.parse(raw);
        migrateLibrary(data);
        return data;
    } catch {
        return initialLibrary;
    }
};
