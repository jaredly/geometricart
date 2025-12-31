import {State} from './state-type';
import {StateV0} from './state-v1';

export const migrateV1 = (v: StateV0): State => {
    return v;
};
