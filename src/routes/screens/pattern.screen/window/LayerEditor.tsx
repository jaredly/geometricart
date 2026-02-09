import {ChevronUp12, ObjectUngroup} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {Entity, EObject, Group, Layer, Pattern} from '../export-types';
import {useExportState} from '../ExportHistory';
import {DragToReorderList, HandleProps} from '../state-editor/DragToReorderList';
import {orderedIds, orderedItems} from '../state-editor/nextOrder';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {useExpanded} from './state';

const EntityView = ({id, $, $$}: {id: string; $: Updater<Entity>; $$: Updater<Layer>}) => {
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

const ObjectView = ({value, $}: {value: EObject; $: Updater<EObject>}) => {
    return <div>{value.id}</div>;
};

const PatternView = ({value, $}: {value: Pattern; $: Updater<Pattern>}) => {
    return <div>{value.id}</div>;
};

const GroupView = ({value, $, $$}: {value: Group; $: Updater<Group>; $$: Updater<Layer>}) => {
    const [expanded, setExpanded] = useExpanded($.toString());
    return (
        <div>
            <div className="flex items-center">
                <div
                    onClick={(evt) => {
                        evt.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    className="p-2 mr-2 hover:bg-amber-400 hover:text-amber-950 rounded-4xl transition-colors"
                >
                    <ChevronUp12 className={expanded ? 'rotate-180' : 'rotate-90'} />
                </div>
                <ObjectUngroup />
                {value.name ?? `Group ${value.id.slice(0, 4)}`}
            </div>
            {expanded ? (
                <div className="p-2 pl-6">
                    {orderedIds(value.entities).map((id) => (
                        <EntityView id={id} $={$$.entities[id]} $$={$$} />
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export const SingleLayerEditor = ({
    value,
    update,
    handleProps,
}: {
    value: Layer;
    update: Updater<Layer>;
    handleProps: HandleProps;
}) => {
    const rootGroup = useValue(update.entities[value.rootGroup]);
    const [expanded, setExpanded] = useExpanded(update.toString());
    if (rootGroup.type !== 'Group') {
        return <div>Root isnt group</div>;
    }
    return (
        <div>
            <div
                className="flex items-center cursor-pointer"
                onClick={(evt) => {
                    evt.stopPropagation();
                    setExpanded(!expanded);
                }}
            >
                <div className="p-2 mr-2 hover:bg-amber-400 hover:text-amber-950 rounded-4xl transition-colors">
                    <ChevronUp12 className={expanded ? 'rotate-180' : 'rotate-90'} />
                </div>
                <ObjectUngroup />
                {value.name ?? `Layer ${value.id.slice(0, 4)}`}
            </div>
            {expanded ? (
                <div className="p-2 pl-6">
                    {orderedIds(rootGroup.entities).map((id) => (
                        <EntityView id={id} $={update.entities[id]} $$={update} />
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export const LayerEditor = () => {
    const state = useExportState();
    const layers = useValue(state.$.layers);
    return <OrderableEditor value={layers} update={state.$.layers} Inner={SingleLayerEditor} />;
};
