import {RouterProvider} from 'react-router-dom';
import {WithPathKit} from '../editor/pk';
import {router} from '../editor';

export default function Editor() {
    return (
        <WithPathKit>
            <RouterProvider router={router} />
        </WithPathKit>
    );
}
