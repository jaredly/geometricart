import typia from 'typia';
import {ExportHistory} from '../ExportHistory';
import {State} from './state-type';
import {blankHistory} from '../../../../json-diff/history';

const isValidHistory = typia.createIs<ExportHistory>();
const isValidState = typia.createIs<State>();
const validateHistory = typia.createValidate<ExportHistory>();

// {version: 0, value: StateV0} | {version: 1, value: StateV1} ...
type OldVersions = never;

export const loadState = (value: unknown): {version: null; value: ExportHistory} | OldVersions => {
    if (isValidHistory(value)) {
        return {version: null, value};
    }
    if (isValidState(value)) {
        return {version: null, value: blankHistory(value)};
    }
    // if (isValidHistoryV0(value)) return {version: 0, value}
    // if (isValidStateV0(value))  return {version: 0, value: blankHistory(value);
    console.log(validateHistory(value));
    throw new Error(`Unable to parse export state`);
};

export const migrateVersion = (value: OldVersions): ExportHistory => {
    // switch (value.version) { ...
    throw new Error(`not yet folks`);
};
