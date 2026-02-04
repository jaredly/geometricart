import typia from 'typia';
import {ExportHistory} from '../ExportHistory';
import {State} from './state-type';
import {blankHistory} from '../../../../json-diff/history';
import {ExportHistory as ExportHistoryV0} from './state-v0';
import {ThinTiling} from '../../../../types';

export const isValidHistory = typia.createIs<ExportHistory>();
export const isValidHistoryV0 = typia.createIs<ExportHistoryV0>();
const isValidState = typia.createIs<State>();
export const validateHistory = typia.createValidate<ExportHistory>();
const isThinTiling = typia.createIs<ThinTiling>();

type OldVersions =
    | {version: 0; value: ExportHistoryV0}
    | {version: 'unknown'; pattern: ThinTiling; id: string; value: any};

export const loadState = (value: unknown): {version: null; value: ExportHistory} | OldVersions => {
    if (!value) {
        throw new Error(`Document doesn't exist.`);
    }
    console.log('here we are', value);
    if (isValidHistory(value)) {
        console.log('valid history');
        return {version: null, value};
    }
    if (isValidState(value)) {
        console.log('valid state');
        return {version: null, value: blankHistory(value)};
    }
    if (isValidHistoryV0(value)) {
        console.log('its v0');
        return {version: 0, value};
    }
    const pattern = (
        Object.values(
            (Object.values(((value as any)?.current ?? value)?.layers ?? {})[0] as any)?.entities ??
                {},
        ).find((e) => (e as any)?.type === 'Pattern') as any
    )?.tiling;
    if (isThinTiling(pattern?.tiling) && typeof pattern.id === 'string') {
        return {version: 'unknown', pattern: pattern.tiling, id: pattern.id, value};
    }
    console.log(pattern, value);

    console.log(validateHistory(value));
    throw new Error(`Unable to parse export state`);
};

export const migrateVersion = (value: OldVersions): ExportHistory => {
    // switch (value.version) { ...
    throw new Error(`not yet folks`);
};
