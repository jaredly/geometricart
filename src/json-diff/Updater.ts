import {DiffNodeA} from './helper2';
import {Extra} from './react';

export type Updater<Current, Tag extends PropertyKey = 'type'> = DiffNodeA<
    unknown,
    Current,
    Tag,
    void,
    Extra
>;
