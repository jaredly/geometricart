import {State} from './state-type';
import {State as StateV0} from './state-v1';
export {StateV0};

export const migrateV1 = (v: StateV0): State => {
    return {...v, version: 1};
    // return v;
};
