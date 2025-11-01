import {RouterProvider} from 'react-router-dom';
// import {WithPathKit} from '../editor/pk';
import {router} from '../editor.client';

export default function Editor() {
    // if (morph) {
    //     root.render(
    //         <WithPathKit>
    //             <Morph />
    //         </WithPathKit>,
    //     );
    // } else if (save) {
    //     getForeignState(image, load).then(
    //         (state) => {
    //             root.render(<AppWithSave state={state} save={save} />);
    //         },
    //         (err) => {
    //             console.log(err);
    //             root.render(<h1>FAILED TO LOARD {err.message}</h1>);
    //         },
    //     );
    // } else {
    //     root.render(
    //         <WithPathKit>
    //             <RouterProvider router={router} />{' '}
    //         </WithPathKit>,
    //     );
    // }

    return (
        // <WithPathKit>
        <RouterProvider router={router} />
        // </WithPathKit>
    );
}
