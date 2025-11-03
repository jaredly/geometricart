import {useNavigate} from 'react-router';
// import {WithPathKit} from '../editor/pk';
import {debounce, key, router, saveState, usePreventNavAway, Welcome} from '../../editor.client';
import type {Route} from './+types/editor';
import {loadGist} from '../../gists';
import {maybeMigrate} from '../../state/migrateState';
import localforage from 'localforage';
import {State} from '../../types';
import {SaveDest} from '../../MirrorPicker';
import {App} from '../../App';
import React from 'react';

export async function clientLoader(p: Route.ClientLoaderArgs) {
    const params = new URL(p.request.url).searchParams;
    const path = params.get('path');
    if (!path) return null;
    const parts = path.split('/').filter(Boolean);
    const [src, id] = parts.length === 2 ? parts : ['', parts[0]];
    if (src === 'gist') {
        const state = await loadGist(id, localStorage.github_access_token);
        return {
            dest: {type: 'gist' as const, token: localStorage.github_access_token},
            state: maybeMigrate(state)!,
            id,
        };
    }
    const state = await localforage.getItem(key(id));
    return {dest: {type: 'local' as const}, state: maybeMigrate(state as State)!, id};
}

export const File = ({dest, state, id}: {dest: SaveDest; state: State; id: string}) => {
    const navigate = useNavigate();
    const [lastSaved, setLastSaved] = React.useState({
        when: Date.now(),
        dirty: null as null | true | (() => void),
        id,
    });
    usePreventNavAway(lastSaved);

    return (
        <App
            closeFile={() => navigate('?')}
            initialState={state}
            lastSaved={dest.type === 'gist' ? lastSaved : null}
            saveState={(state) => {
                if (dest.type === 'gist') {
                    const force = debounce(() => {
                        setLastSaved((s) => ({...s, dirty: true}));
                        return saveState(state, id, dest).then(() => {
                            setLastSaved({when: Date.now(), dirty: null, id});
                        });
                    }, 10000);
                    setLastSaved((s) => ({...s, dirty: force}));
                } else {
                    saveState(state, id, dest);
                }
            }}
        />
    );
};

export default function Editor({loaderData}: Route.ComponentProps) {
    const navigate = useNavigate();

    if (!loaderData) {
        return (
            <Welcome
                navigate={(path) => {
                    navigate(`?path=${path}`);
                }}
            />
        );
    }
    const {dest, state, id} = loaderData;

    return <File dest={dest} state={state} id={id} />;
}
