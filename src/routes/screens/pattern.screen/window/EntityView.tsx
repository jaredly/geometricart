import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {Entity, Layer} from '../export-types';
import {ObjectView} from './LayerEditor';
import {PatternView} from './PatternView';
import {GroupView} from './GroupView';

export const EntityView = ({id, $, $$}: {id: string; $: Updater<Entity>; $$: Updater<Layer>}) => {
    const value = useValue($);
    switch (value.type) {
        case 'Group':
            return <GroupView value={value} $={$.$variant('Group')} $$={$$} />;
        case 'Pattern':
            return <PatternView value={value} $={$.$variant('Pattern')} />;
        case 'Object':
            return <ObjectView value={value} $={$.$variant('Object')} />;
    }
};
