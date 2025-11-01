import {type RouteConfig, index, prefix, route} from '@react-router/dev/routes';

// import {Database} from 'bun:sqlite';
// const db = new Database(join(import.meta.dirname, '../../data.db'));
// const query = db.query('select * from Tiling');
// const alls = query.all();

export default [
    index('./screens/home.tsx'),
    ...prefix('gallery', [
        index('./screens/gallery.tsx'),
        route('pattern/:id', './screens/pattern.tsx'),
        route('pattern/:id/:img', './screens/pattern-svg.tsx'),
    ]),
    route('animator', './screens/animator.tsx'),
    route('uploads/:fname', './screens/uploads-image.ts'),
    route('editor', './screens/editor.tsx'),
] as RouteConfig;
