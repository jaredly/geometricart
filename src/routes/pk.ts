import {pk as pkc} from './pk.client';
import {pk as pks} from './pk.server';

export const pk = pkc ?? pks;
