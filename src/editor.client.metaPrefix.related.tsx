import {Welcome, File, PkDebug} from './editor.client';
import {Route, createRoutesFromElements, createHashRouter} from 'react-router-dom';
import localforage from 'localforage';
import {Checkpoint, State, Tiling} from './types';
import {SaveDest} from './SaveDest';
import {exportPNG} from './editor/ExportPng.exportPNG.related';
import {loadGist, newGist, saveGist} from './gists';
import {maybeMigrate} from './state/migrateState';

export const metaPrefix = 'meta:';

export const keyPrefix = 'geometric-art-';

export const thumbPrefix = 'thumb:';

export const snapshotPrefix = 'snapshot:';

export const key = (id: string) => keyPrefix + id;

export const meta = (id: string) => metaPrefix + key(id);

export const snapshotKey = (id: string, checkpoint: Checkpoint) =>
    snapshotPrefix + key(id) + ':' + checkpointToString(checkpoint);

export const updateMeta = async (
    id: string,
    update: Partial<MetaData> | ((v: MetaData) => Partial<MetaData>),
) => {
    const current = await localforage.getItem<MetaData>(meta(id));
    if (!current) {
        return;
    }
    return localforage.setItem(meta(id), {
        ...current,
        ...(typeof update === 'function' ? update(current) : update),
    });
};

export const newState = async (state: State, dest: SaveDest) => {
    // if (!state) {
    //     state = setupState(mirror);
    // }
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    if (dest.type === 'local') {
        const id = genid();
        localforage.setItem(thumbPrefix + key(id), blob);
        localforage.setItem<MetaData>(metaPrefix + key(id), newMetaData(id, state));
        return localforage.setItem(key(id), state).then(() => '/' + id);
    } else {
        return newGist(state, blob, dest.token).then((id) => '/gist/' + id);
    }
};

export const addSnapshot = async (id: string, state: State) => {
    const checkpoint: Checkpoint = {
        branchId: state.history.currentBranch,
        undo: state.history.undo,
        branchLength: state.history.branches[state.history.currentBranch].items.length,
    };
    const blob = await exportPNG(400, state, 1000, false, false, 0);
    updateMeta(id, (meta) => ({
        checkpoints: [...(meta.checkpoints || []), checkpoint],
    }));
    localforage.setItem(snapshotKey(id, checkpoint), blob);
};

export const saveState = async (state: State, id: string, dest: SaveDest) => {
    const blob = await exportPNG(
        400,
        {...state, view: {...state.view, guides: false}},
        1000,
        false,
        false,
        0,
    );
    if (dest.type === 'local') {
        localforage.setItem(key(id), state);
        updateMeta(id, {
            updatedAt: Date.now(),
            size: JSON.stringify(state).length,
            tilings: Object.values(state.tilings),
        });
        localforage.setItem(thumbPrefix + key(id), blob);
    } else {
        return await saveGist(id, state, blob, dest.token);
    }
};

export const genid = () => Math.random().toString(36).substring(2, 15);

export type MetaData = {
    createdAt: number;
    updatedAt: number;
    openedAt: number;
    id: string;
    size: number;
    tilings: Tiling[];
    checkpoints?: Array<Checkpoint>;
};

export const checkpointToString = (c: Checkpoint) => `${c.branchId}-${c.branchLength}-${c.undo}`;

export const router = createHashRouter(
    createRoutesFromElements([
        <Route index element={<Welcome />} />,
        <Route
            path="gist/:id"
            element={
                <File
                    gist
                    dest={{
                        type: 'gist',
                        token: localStorage.github_access_token,
                    }}
                />
            }
            loader={({params}) =>
                loadGist(params.id!, localStorage.github_access_token).then((state) =>
                    maybeMigrate(state as State),
                )
            }
        />,
        <Route
            path=":id"
            element={<File dest={{type: 'local'}} />}
            loader={({params}) =>
                localforage.getItem(key(params.id!)).then((state) => maybeMigrate(state as State))
            }
        />,
        <Route path="pk" element={<PkDebug />} />,
    ]),
);

export function newMetaData(id: string, state: State): MetaData {
    return {
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        openedAt: Date.now(),
        size: JSON.stringify(state).length,
        tilings: [],
    };
}
