import {RouterProvider} from 'react-router-dom';
import {AppWithSave, getForeignState, router} from './editor.client';
import {WithPathKit} from './editor/pk';
import {Morph} from './Morph';
import {createRoot} from 'react-dom/client';

const morph = false;

const params = new URLSearchParams(location.search);

const image = params.get('image');
const save = params.get('save');
const load = params.get('load');
const back = params.get('back');

const root = (window._reactRoot =
    window._reactRoot || createRoot(document.getElementById('root')!));

if (morph) {
    root.render(
        <WithPathKit>
            <Morph />
        </WithPathKit>,
    );
} else if (save) {
    getForeignState(image, load).then(
        (state) => {
            root.render(<AppWithSave state={state} save={save} />);
        },
        (err) => {
            console.log(err);
            root.render(<h1>FAILED TO LOARD {err.message}</h1>);
        },
    );
} else {
    root.render(
        <WithPathKit>
            <RouterProvider router={router} />{' '}
        </WithPathKit>,
    );
}
