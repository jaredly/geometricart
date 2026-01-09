import typia from 'typia';
import {ExportHistory} from '../ExportHistory';
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
