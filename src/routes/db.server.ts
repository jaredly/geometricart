import {join} from 'path';
import {State, Tiling} from '../types';
import {Database} from 'bun:sqlite';
import {existsSync, readFileSync} from 'fs';
import {migrateState} from '../state/migrateState';

export const db = new Database(join(import.meta.dirname, '../../data.db'));

export const saveAllPatterns = (patterns: {hash: string; tiling: Tiling}[]) => {
    const query = db.query('update Tiling set json = $json where hash = $hash');
    const queryAll = db.transaction((patterns) => {
        let up = [];
        for (const pattern of patterns) {
            const res = query.run({$json: JSON.stringify(pattern.tiling), $hash: pattern.hash});
            if (!res.changes) {
                throw new Error(`why no change ${pattern.hash} in Tiling???`);
            }
            up.push(res.changes);
        }
        return up;
    });
    const count = queryAll(patterns);
    console.log('saved', count);
    // for (let pattern of patterns) {
    //     query.run({$json: JSON.stringify(pattern.tiling), hash: pattern.hash});
    // }
    // return (query.all() as {hash: string; json: string}[]).map(({hash, json}) => ({
    //     hash,
    //     tiling: JSON.parse(json) as Tiling,
    // }));
};

export const getAllPatterns = () => {
    const query = db.query('select hash, json from Tiling');
    return (query.all() as {hash: string; json: string}[]).map(({hash, json}) => ({
        hash,
        tiling: JSON.parse(json) as Tiling,
    }));
};

export const getPattern = (hash: string) => {
    const query = db.query('select id, hash, json from Tiling where hash = ?');
    const res = query.get(hash) as {id: string; hash: string; json: string};
    if (!res) return null;
    const tiling = JSON.parse(res.json) as Tiling;
    const links = db.query(`select imageId from ImageTiling where tilingId = ?`).all(res.id) as {
        imageId: string;
    }[];
    const images = db
        .query(
            `select location, source, date, url from Image where id in (${links.map((_, i) => `?${i + 1}`)})`,
        )
        .all(...links.map((l) => l.imageId)) as {
        location: string;
        source: string;
        date: string;
        url: string;
    }[];
    const uploadRoot = join(import.meta.dirname, '../../../../apps/pattern-db/public');
    const imageDrawings = Object.fromEntries(
        images
            .map((image) => {
                const path = join(uploadRoot, image.url.replace(/^\//, ''));
                if (existsSync(path + '.json')) {
                    return [
                        image.url,
                        migrateState(JSON.parse(readFileSync(path + '.json', 'utf-8'))),
                    ];
                }
                return null;
            })
            .filter(Boolean) as [string, State][],
    );
    return {hash, tiling, images, imageDrawings};
};

// const query = db.query('select id, hash, json from Tiling');
// const alls = query.all() as {id: string; hash: string}[];
