import fs, {readdirSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import {ExportHistory} from '../src/routes/screens/pattern.screen/ExportHistory';
import {getAllPatterns} from '../src/routes/db.server';
import {State} from '../src/routes/screens/pattern.screen/types/state-type';
import {thinTiling} from '../src/routes/screens/pattern.screen/render/renderPattern';

const patterns = getAllPatterns();
const byHash = Object.fromEntries(patterns.map((p) => [p.hash, p.tiling]));

const fixState = (state: State) => {
    let up = false;
    Object.values(state.layers).forEach((layer) => {
        Object.values(layer.entities).forEach((entity) => {
            if (entity.type === 'Pattern') {
                if (typeof entity.tiling === 'string') {
                    if (!byHash[entity.tiling]) {
                        throw new Error('cant find tiling ' + entity.tiling);
                    }
                    console.log(` -> referenced ${entity.tiling}`);
                    entity.tiling = {id: entity.tiling, tiling: thinTiling(byHash[entity.tiling])};
                    up = true;
                }
            }
        });
    });
    return up;
};

const base = join(__dirname, '../assets/exports');
readdirSync(base).forEach((name) => {
    if (name.endsWith('.json')) {
        const data: ExportHistory = JSON.parse(readFileSync(join(base, name), 'utf-8'));
        if (typeof data.root !== 'string') {
            throw new Error('not history');
        }
        let up = fixState(data.current);
        up = fixState(data.initial) || up;
        if (!up) return;
        for (let node of Object.values(data.nodes)) {
            for (let change of node.changes) {
                const last = change.path[change.path.length - 1];
                if (last.type === 'key' && last.key === 'tiling') {
                    console.log(`${name} <--- TILING HAD CHANGE`);
                    return;
                }
            }
        }
        console.log(`updated ${name}`);
        writeFileSync(join(base, name), JSON.stringify(data, null, 2));
    }
});
