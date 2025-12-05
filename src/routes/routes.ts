import {type RouteConfig, index, prefix, route} from '@react-router/dev/routes';

// import {Database} from 'bun:sqlite';
// const db = new Database(join(import.meta.dirname, '../../data.db'));
// const query = db.query('select * from Tiling');
// const alls = query.all();

export default [
    index('./screens/home.tsx'),
    route('gallery.json', './screens/gallery-json.ts'),
    ...prefix('gallery', [
        index('./screens/gallery.tsx'),
        route('pattern/add', './screens/pattern-add.tsx'),
        route('pattern/:id', './screens/pattern.tsx'),
        route('pattern/:id/:img', './screens/pattern-svg.tsx'),
    ]),
    route('export/:id?', './screens/pattern.screen/pattern-export.tsx'),
    route('animator', './screens/animators.tsx'),
    route('animator/:id', './screens/animator.tsx'),
    route('uploads/:fname', './screens/uploads-image.ts'),
    route('assets/*', './screens/assets.ts'),
    route('editor', './screens/editor.tsx'),
    route('debug/transforms', './screens/debug.transforms.tsx'),
] as RouteConfig;
