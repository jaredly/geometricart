import typia from 'typia';
import {ExportHistory} from '../ExportHistory';
import {isValidHistory} from '../types/load-state';
import {TypedKV} from './kv-idb2';

type ExportMeta = {updated: number; created: number; preview?: string};
type SnapshotMeta = {updated: number; created: number; size: number};
const isExportMeta = typia.createIs<ExportMeta>();

const isSnapshotMeta = typia.createIs<SnapshotMeta>();

export const db = new TypedKV<{
    exports: ExportHistory; // | StateV0 | StateV1 etc...
    exportMeta: ExportMeta;
    snapshots: Blob;
    snapshotMeta: SnapshotMeta;
}>(
    {
        exports: typia.createIs<ExportHistory>(),
        exportMeta: isExportMeta,
        snapshots: (v) => v instanceof Blob,
        snapshotMeta: isSnapshotMeta,
    },
    {dbName: 'geometric-art', storeName: 'kv', onInvalidValue: 'undefined'},
    {
        exports: typia.createValidate<ExportHistory>(),
    },
);

export default db;
// let db: IDBDatabase | undefined;

// async function getDB() {
//     if (db) return db;

//     db = await new Promise<IDBDatabase>((resolve, reject) => {
//         const req = indexedDB.open('kv-db', 1);

//         req.onupgradeneeded = () => {
//             req.result.createObjectStore('kv');
//         };

//         req.onsuccess = () => {
//             const d = req.result;
//             d.onversionchange = () => {
//                 d.close();
//                 db = undefined;
//             };
//             resolve(d);
//         };

//         req.onerror = () => reject(req.error);
//     });

//     return db;
// }

// export async function set(key: string, value: Blob) {
//     const db = await getDB();
//     const tx = db.transaction('kv', 'readwrite');

//     return new Promise((res) => {
//         tx.oncomplete = res;
//         tx.objectStore('kv').put(value, key);
//     });
// }

// export async function get(key: string) {
//     const db = await getDB();
//     const tx = db.transaction('kv', 'readonly');

//     return new Promise<Blob>((resolve) => {
//         const req = tx.objectStore('kv').get(key);
//         req.onsuccess = () => resolve(req.result);
//     });
// }

// export async function del(key: string) {
//     const db = await getDB();
//     const tx = db.transaction('kv', 'readwrite');

//     return new Promise((resolve, reject) => {
//         tx.objectStore('kv').delete(key);
//         tx.oncomplete = () => resolve(null);
//         tx.onerror = () => reject(tx.error);
//     });
// }

// export async function keys() {
//     const db = await getDB();
//     const tx = db.transaction('kv', 'readonly');
//     const store = tx.objectStore('kv');

//     return new Promise<IDBValidKey[]>((resolve, reject) => {
//         const req = store.getAllKeys();
//         req.onsuccess = () => resolve(req.result);
//         req.onerror = () => reject(req.error);
//     });
// }
