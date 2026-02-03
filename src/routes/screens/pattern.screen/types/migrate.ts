import {History} from '../../../../json-diff/history';
import {ExportAnnotation} from '../ExportHistory';
import {State} from './state-type';
import {State as StateV0} from './state-v1';
export {StateV0};

export type ExportHistoryV0 = History<StateV0, ExportAnnotation>;

export const migrateV1 = (v: StateV0): State => {
    return {...v, version: 1};
};
