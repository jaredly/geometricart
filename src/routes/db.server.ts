import {join} from 'path';
import {Tiling} from '../types';
import {Database} from 'bun:sqlite';

export const db = new Database(join(import.meta.dirname, '../../data.db'));

export const getAllPatterns = () => {
    const query = db.query('select hash, json from Tiling');
    return (query.all() as {hash: string; json: string}[]).map(({hash, json}) => ({
        hash,
        tiling: JSON.parse(json) as Tiling,
    }));
};

export const getPattern = (hash: string) => {
    const query = db.query('select hash, json from Tiling where hash = ?');
    const res = query.get(hash) as {hash: string; json: string};
    if (!res) return null;
    const tiling = JSON.parse(res.json) as Tiling;
    return {hash, tiling};
};

// const query = db.query('select id, hash, json from Tiling');
// const alls = query.all() as {id: string; hash: string}[];
