import {RouterProvider} from 'react-router-dom';
// import {WithPathKit} from '../editor/pk';
import {debounce, key, router, saveState, usePreventNavAway, Welcome} from '../../editor.client';
import type {Route} from './+types/editor';
import {loadGist} from '../../gists';
import {maybeMigrate} from '../../state/migrateState';
import localforage from 'localforage';
import {State} from '../../types';
import {SaveDest} from '../../MirrorPicker';
import {App} from '../../App';

export async function clientLoader(p: Route.ClientLoaderArgs) {
    const params = new URL(p.request.url).searchParams;
    const id = params.get('id');
    const src = params.get('src');
    if (!id) return null;
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
    const [lastSaved, setLastSaved] = React.useState({
        when: Date.now(),
        dirty: null as null | true | (() => void),
        id,
    });
    usePreventNavAway(lastSaved);

    return (
        <App
            closeFile={() => (location.hash = '/')}
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
    if (!loaderData) {
        return <Welcome />;
    }
    const {dest, state, id} = loaderData;

    return <File dest={dest} state={state} id={id} />;
}
