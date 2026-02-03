import typia from 'typia';
import {ExportHistory} from '../ExportHistory';
import {State} from './state-type';
import {blankHistory} from '../../../../json-diff/history';
import {ExportHistoryV0} from './migrate';

export const isValidHistory = typia.createIs<ExportHistory>();
export const isValidHistoryV0 = typia.createIs<ExportHistoryV0>();
const isValidState = typia.createIs<State>();
export const validateHistory = typia.createValidate<ExportHistory>();

type OldVersions = {version: 0; value: ExportHistoryV0};

export const loadState = (value: unknown): {version: null; value: ExportHistory} | OldVersions => {
    if (!value) {
        throw new Error(`Document doesn't exist.`);
    }
    if (isValidHistory(value)) {
        return {version: null, value};
    }
    if (isValidState(value)) {
        return {version: null, value: blankHistory(value)};
    }
    if (isValidHistoryV0(value)) return {version: 0, value};

    console.log(validateHistory(value));
    throw new Error(`Unable to parse export state`);
};

export const migrateVersion = (value: OldVersions): ExportHistory => {
    // switch (value.version) { ...
    throw new Error(`not yet folks`);
};
