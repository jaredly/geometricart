import {ChevronUp12, ObjectUngroup} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {EObject, Layer, Pattern} from '../export-types';
import {useExportState} from '../ExportHistory';
import {HandleProps} from '../state-editor/DragToReorderList';
import {orderedIds} from '../state-editor/nextOrder';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {EntityView} from './EntityView';
import {useExpanded} from './state';
import {PatternPreview} from './PatternPreview';

export const ObjectView = ({value, $}: {value: EObject; $: Updater<EObject>}) => {
    return <div>{value.id}</div>;
};

export const PatternView = ({value, $}: {value: Pattern; $: Updater<Pattern>}) => {
    return (
        <div className="flex flex-row items-center">
            <PatternPreview tiling={value.tiling.tiling} />
            {value.id}
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
                <ObjectUngroup className="mr-2" />
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
