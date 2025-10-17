import { write } from 'bun';
import data from './deps.json';

const transitive = {};

const roots = data.modules.filter((m) => m.source.includes('src/routes'));
console.log(roots);

const bySource: Record<string, (typeof data.modules)[0]> = {}
data.modules.forEach(m => bySource[m.source] = m)

// const seen = {}
// const graph: Record<string, string[]> = {}

const rootPaths: Record<string, Record<string, string[]>> = {}
roots.forEach(root => {
    const pathsTo: Record<string,string[]> = {}
    const walk = (dep: typeof root['dependencies'][0], path: string[]) => {
        if (pathsTo[dep.resolved]) {
            if (path.length < pathsTo[dep.resolved].length) {
                pathsTo[dep.resolved] = path
            }
            return
        }
        pathsTo[dep.resolved] = path
        const mod = bySource[dep.resolved]
        if (!mod) {
            console.warn(`no mo? ${dep.resolved}`)
            return
        }
        const cpath = path.concat([dep.resolved])
        mod.dependencies.forEach(dep => walk(dep, cpath))
    }
    root.dependencies.forEach(dep => {
        walk(dep, [])
    })
    rootPaths[root.source] = pathsTo
})
write('./roots.json', JSON.stringify(rootPaths, null ,2))

// const walk = (source: string) => {
//     if (graph[source]) return
//     graph[source] = []
//     const mod = bySource[source]
//     mod.dependencies.forEach(dep => {
//     })
// }

// start at deps in `src/routes
// find our way to a `react-three` route
