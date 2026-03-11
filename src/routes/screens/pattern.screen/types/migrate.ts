import {State} from './state-type';
import {State as StateV0} from './state-v0';
export {StateV0};

export const migrateV1 = (v: StateV0): State => {
    throw new Error('cant');
    // return {...v, version: 1};
    // return v;
};
