import localforage from 'localforage';
import {initialLibrary, Library} from '../types';

const key = 'geometric-art:library';

const migrateLibrary = (library: Library) => {
    // TODO
};

const saveLibrary = (library: Library) => {
    localforage.setItem(key, JSON.stringify(library));
};

const loadLibrary = async () => {
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
