import { viteFsProxy } from './vite-fs-proxy.mjs';

viteFsProxy({
    root: './',
    port: 3017,
    innerPort: 3018,
    dirmap: {},
});
