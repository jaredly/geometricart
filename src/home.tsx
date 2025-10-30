import './polyfill';
import {createRoot, } from 'react-dom/client';
import 'primereact/resources/themes/bootstrap4-dark-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import {
    Route,
    createRoutesFromElements,
    createHashRouter,
} from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

// gallery

const Editor = () => {};

const Home = () => {
    return <div>Home</div>;
};

const topRoutes = createRoutesFromElements([
    <Route index element={<div>Home</div>} />,
    <Route path="gallery" element={<div>Home</div>} />,
    //
]);

const editorRoutes = createRoutesFromElements([
    //
]);

const topRouter = createHashRouter(
    createRoutesFromElements([
        <Route index key={0} element={<Home />} />,
        //
    ]),
);

const root = (window._reactRoot =
    window._reactRoot || createRoot(document.getElementById('root')!));

// root.render(<RouterProvider router={router} />);
