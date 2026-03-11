import typia from 'typia';
import {ExportHistory} from '../ExportHistory';
import {State} from './state-type';
import {blankHistory} from '../../../../json-diff/history';
import {ExportHistory as ExportHistoryV0} from './state-v0';
import {ThinTiling} from '../../../../types';
import {EntityRoot} from '../export-types';

export const isValidHistory = typia.createIs<ExportHistory>();
export const isValidHistoryV0 = typia.createIs<ExportHistoryV0>();
const isValidState = typia.createIs<State>();
export const validateHistory = typia.createValidate<ExportHistory>();
const isThinTiling = typia.createIs<ThinTiling>();

type OldVersions =
    | {version: 0; value: ExportHistoryV0}
    | {version: 'unknown'; pattern: ThinTiling; id: string; value: any};

const fromLegacyLayers = (value: any): EntityRoot | null => {
    const firstLayer = Object.values(value?.layers ?? {})[0] as any;
    if (!firstLayer?.entities || typeof firstLayer?.rootGroup !== 'string') return null;
    return {
        rootGroup: firstLayer.rootGroup,
        entities: firstLayer.entities,
    };
};

const normalizeState = (value: any): State | null => {
    if (!value || typeof value !== 'object') return null;
    if (value.entities && typeof value.rootGroup === 'string') {
        return value as State;
    }
    const legacy = fromLegacyLayers(value);
    if (!legacy) return null;
    return {
        ...value,
        ...legacy,
    } as State;
};

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
    const normalizedCurrent = normalizeState((value as any)?.current);
    if (normalizedCurrent && isValidState(normalizedCurrent)) {
        return {version: null, value: blankHistory(normalizedCurrent)};
    }
    const normalizedState = normalizeState(value as any);
    if (normalizedState && isValidState(normalizedState)) {
        return {version: null, value: blankHistory(normalizedState)};
    }
    if (isValidHistoryV0(value)) {
        console.log('its v0');
        return {version: 0, value};
    }
    const pattern = (
        Object.values(
            normalizeState((value as any)?.current ?? value)?.entities ??
                fromLegacyLayers((value as any)?.current ?? value)?.entities ??
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
