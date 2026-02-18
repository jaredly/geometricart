import {ObjectUngroup} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {
    BaseKind,
    describeKind,
    Entity,
    EObject,
    Fill,
    Group,
    Layer,
    Pattern,
    PatternContents,
    ShapeKind,
    ShapeStyle,
} from '../export-types';
import {useExportState} from '../ExportHistory';
import {HandleProps} from '../state-editor/DragToReorderList';
import {orderedIds, orderedItems} from '../state-editor/nextOrder';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {EntityView} from './EntityView';
import {Expandable} from './Expandable';
import {DisabledIcon} from './DisabledIcon';
import {TreeActions, TreeNode, TreeView} from './TreeView';
import {useMemo} from 'react';

export const ObjectView = ({value, $}: {value: EObject; $: Updater<EObject>}) => {
    return <div>{value.id}</div>;
};

export const PatternContentsView = ({
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
        case 'layers':
            return <PatternLayersView value={value} update={update.$variant('layers')} />;
        default:
            return <div>Not yet</div>;
    }
};

const BaseStyleView = ({
    update,
    value,
}: {
    update: Updater<ShapeStyle<BaseKind>>;
    value: ShapeStyle<BaseKind>;
}) => <StyleView<BaseKind> describeKind={describeKind} update={update} value={value} />;

const ShapeStyleView = ({
    update,
    value,
}: {
    update: Updater<ShapeStyle<ShapeKind>>;
    value: ShapeStyle<ShapeKind>;
}) => <StyleView<ShapeKind> describeKind={describeKind} update={update} value={value} />;

const StyleView = <Kind,>({
    update,
    value,
    describeKind,
}: {
    update: Updater<ShapeStyle<Kind>>;
    value: ShapeStyle<Kind>;
    describeKind: (kind: Kind) => string;
}) => {
    const parts = value.kind.map(describeKind);
    const fks = Object.keys(value.fills);
    if (fks.length) parts.push(`${fks.length} fill${fks.length === 1 ? '' : 's'}`);
    const lks = Object.keys(value.lines);
    if (lks.length) parts.push(`${lks.length} line{lks.length === 1 ? '' : 's'}`);
    return (
        <div>
            <Expandable
                ex={update.toString()}
                title={
                    <div className="flex flex-row items-center">
                        shapes
                        <div>Style {parts.join(', ')}</div>
                        <DisabledIcon value={value.disabled} update={update.disabled} />
                    </div>
                }
            >
                <OrderableEditor value={value.fills} update={update.fills} Inner={FillView} />
                <OrderableEditor value={value.lines} update={update.lines} Inner={FillView} />
            </Expandable>
        </div>
    );
};

const FillView = ({update, value}: {update: Updater<Fill>; value: Fill}) => {
    return <div>Helo fill</div>;
};

const PatternLayersView = ({
    update,
    value,
}: {
    update: Updater<PatternContents & {type: 'layers'}>;
    value: PatternContents & {type: 'layers'};
}) => {
    return (
        <Expandable
            ex={update.toString()}
            title={
                <div className="flex flex-row items-center">
                    shapes
                    <DisabledIcon value={value.disabled} update={update.disabled} />
                </div>
            }
        >
            <OrderableEditor value={value.styles} update={update.styles} Inner={BaseStyleView} />
        </Expandable>
    );
};

const PatternShapesView = ({
    update,
    value,
}: {
    update: Updater<PatternContents & {type: 'shapes'}>;
    value: PatternContents & {type: 'shapes'};
}) => {
    return (
        <Expandable
            ex={update.toString()}
            title={
                <div className="flex flex-row items-center">
                    shapes
                    <DisabledIcon value={value.disabled} update={update.disabled} />
                </div>
            }
        >
            <OrderableEditor value={value.styles} update={update.styles} Inner={ShapeStyleView} />
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
    const nodes = useMemo((): Record<string, TreeNode> => {
        type Item =
            | {type: 'layer'; layer: Layer}
            | {type: 'group'; group: Group; layer: string}
            | {type: 'pattern'; layer: string; pattern: Pattern}
            | {type: 'object'; layer: string; object: EObject}
            | {
                  type: 'pattern-contents';
                  layer: string;
                  pattern: Pattern;
                  contents: PatternContents;
              };
        const ids: Record<string, Item> = {};

        const nodes: Record<string, TreeNode> = {};

        const addEntity = (layer: Layer, entity: Entity): string => {
            switch (entity.type) {
                case 'Group':
                    return addGroup(layer, entity);
                case 'Pattern':
                    return addPattern(layer, entity);
                case 'Object':
                    return addObject(layer, entity);
            }
        };

        const addObject = (layer: Layer, object: EObject) => {
            const id = layer.id + ':' + object.id + ':object';
            ids[id] = {type: 'object', layer: layer.id, object};
            nodes[id] = {
                id,
                kind: 'Object',
                childKinds: [],
                // children: object.style
                children: [],
                name: 'Object ' + object.id,
                rightIcons: [],
            };
            return id;
        };

        // const addPatternContents = (
        //     layer: Layer,
        //     pattern: Pattern,
        //     contents: PatternContents,
        // ): string => {
        //     return '';
        // };

        const addPattern = (layer: Layer, pattern: Pattern): string => {
            const id = layer.id + ':' + pattern.id + ':pattern';
            ids[id] = {type: 'pattern', layer: layer.id, pattern};
            nodes[id] = {
                id,
                kind: 'Pattern',
                childKinds: ['PatternContents'],
                children: [],
                // children: orderedItems(pattern.contents).map((item) =>
                //     addPatternContents(layer, pattern, item),
                // ),
                name: 'Pattern ' + pattern.id,
                rightIcons: [],
            };
            return id;
        };

        const addGroup = (layer: Layer, group: Group): string => {
            const rgi = layer.id + ':' + group.id + ':group';
            ids[rgi] = {
                type: 'group',
                group: layer.entities[layer.rootGroup] as Group,
                layer: layer.id,
            };
            nodes[rgi] = {
                id: rgi,
                name: 'Group ' + layer.rootGroup,
                children: orderedIds(group.entities).map((eid) =>
                    addEntity(layer, layer.entities[eid]),
                ),
                kind: 'Group',
                childKinds: ['Pattern', 'Group', 'Object'],
                rightIcons: [],
            };
            return rgi;
        };

        const addLayer = (key: string, layer: Layer) => {
            const id = `${key}:layer`;
            ids[id] = {type: 'layer', layer};
            const rgi = key + ':' + layer.rootGroup + ':group';
            nodes[id] = {
                id,
                name: 'Layer ' + key,
                children: [rgi],
                kind: 'Layer',
                childKinds: ['Pattern', 'Group', 'Object'],
                rightIcons: [],
            };
            addGroup(layer, layer.entities[layer.rootGroup] as Group);
            return id;
        };

        nodes.root = {
            id: 'root',
            name: 'Layers',
            children: Object.entries(layers).map(([key, layer]) => addLayer(key, layer)),
            kind: 'Root',
            childKinds: ['Layer'],
            rightIcons: [],
        };
        return nodes;
    }, [layers]);
    const actions = useMemo((): TreeActions => {
        return {
            move(id, parent, newParent, order) {},
            insert(id, parent, order) {},
            delete(id, parent) {},
            rename(id, name) {},
            add(kind, parent) {},
        };
    }, []);

    return <TreeView actions={actions} nodes={nodes} root={'root'} />;
    // return (
    //     <div className="flex-1">
    //         <OrderableEditor value={layers} update={state.$.layers} Inner={SingleLayerEditor} />
    //     </div>
    // );
};
