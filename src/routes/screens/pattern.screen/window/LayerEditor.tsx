import {CogIcon, ExternalLinkIcon, ObjectUngroup} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {EObject, Layer, Pattern, PatternContents, ShapeKind, ShapeStyle} from '../export-types';
import {useExportState} from '../ExportHistory';
import {HandleProps} from '../state-editor/DragToReorderList';
import {orderedIds} from '../state-editor/nextOrder';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {EntityView} from './EntityView';
import {PatternPreview} from './PatternPreview';
import {ShapeStylesEditor} from '../state-editor/ShapeStylesEditor';
import {Expandable} from './Expandable';
import {DisabledIcon} from './DisabledIcon';

export const ObjectView = ({value, $}: {value: EObject; $: Updater<EObject>}) => {
    return <div>{value.id}</div>;
};

export const PatternView = ({value, $}: {value: Pattern; $: Updater<Pattern>}) => {
    return (
        <Expandable
            ex={$.toString()}
            title={
                <>
                    <PatternPreview tiling={value.tiling.tiling} />
                    {value.id}
                    <a
                        className="link text-sm mx-4 hover:text-amber-400"
                        target="_blank"
                        href={`/gallery/pattern/${value.tiling.id}`}
                        onClick={(evt) => evt.stopPropagation()}
                    >
                        <ExternalLinkIcon />
                    </a>
                    <div style={{flex: 1}} />
                    <button
                        onClick={(evt) => {
                            evt.stopPropagation();
                        }}
                        className="hidden group-hover:block cursor-pointer hover:text-amber-400"
                    >
                        <CogIcon />
                    </button>
                </>
            }
        >
            <OrderableEditor
                value={value.contents}
                update={$.contents}
                Inner={PatternContentsView}
            />
        </Expandable>
    );
};

const PatternContentsView = ({
    value,
    update,
    handleProps,
}: {
    value: PatternContents;
    update: Updater<PatternContents>;
    handleProps: HandleProps;
}) => {
    switch (value.type) {
        case 'shapes':
            return <PatternShapesView value={value} update={update.$variant('shapes')} />;
        default:
            return <div>Not yet</div>;
    }
};

const StyleView = ({
    update,
    value,
}: {
    update: Updater<ShapeStyle<ShapeKind>>;
    value: ShapeStyle<ShapeKind>;
}) => {
    return <div>Style</div>;
};

const PatternShapesView = ({
    update,
    value,
}: {
    update: Updater<PatternContents & {type: 'shapes'}>;
    value: PatternContents & {type: 'shapes'};
}) => {
    return (
        <Expandable ex={update.toString()} title={'Shapes I guess'}>
            <OrderableEditor value={value.styles} update={update.styles} Inner={StyleView} />
        </Expandable>
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
    if (rootGroup.type !== 'Group') {
        return <div>Root isnt group</div>;
    }
    return (
        <Expandable
            ex={update.toString()}
            title={
                <>
                    <ObjectUngroup className="mr-2" />
                    {value.name ?? `Layer ${value.id.slice(0, 4)}`}
                    <DisabledIcon value={value.disabled} update={update.disabled} />
                </>
            }
        >
            {orderedIds(rootGroup.entities).map((id) => (
                <EntityView id={id} $={update.entities[id]} $$={update} />
            ))}
        </Expandable>
    );
};

export const LayerEditor = () => {
    const state = useExportState();
    const layers = useValue(state.$.layers);
    return (
        <div className="flex-1">
            <OrderableEditor value={layers} update={state.$.layers} Inner={SingleLayerEditor} />
        </div>
    );
};
