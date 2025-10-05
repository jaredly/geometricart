import {type RouteConfig, route, index, layout, prefix} from '@react-router/dev/routes';

export default [
    index('./home.tsx'),
    // ...prefix('gallery', [index('./gallery.tsx'), route('pattern/:id', './pattern.tsx')]),
    route('editor', './editor.tsx'),
    // route('admin', './admin.tsx'),
] as RouteConfig;
