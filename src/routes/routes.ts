import {type RouteConfig, index, prefix, route} from '@react-router/dev/routes';

// import {Database} from 'bun:sqlite';
// const db = new Database(join(import.meta.dirname, '../../data.db'));
// const query = db.query('select * from Tiling');
// const alls = query.all();

export default [
    index('./home.tsx'),
    ...prefix('gallery', [
        index('./gallery.tsx'),
        route('pattern/:id', './pattern.tsx'),
        route('pattern/:id/:img', './pattern-svg.tsx'),
    ]),
    route('editor', './editor.tsx'),
] as RouteConfig;
