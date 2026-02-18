import {ObjectUngroup} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {
    BaseKind,
    describeKind,
    Entity,
    EObject,
    FillOrLine,
    Group,
    Pattern,
    PatternContents,
    ShapeKind,
    ShapeStyle,
} from '../export-types';
import {useExportState} from '../ExportHistory';
import {HandleProps} from '../state-editor/DragToReorderList';
import {orderedIds} from '../state-editor/nextOrder';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {EntityView} from './EntityView';
import {Expandable} from './Expandable';
import {DisabledIcon} from './DisabledIcon';
import {TreeActions, TreeNode, TreeView} from './TreeView';
import {useMemo} from 'react';
import {State} from '../types/state-type';

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
    const fks = Object.keys(value.items);
    if (fks.length) parts.push(`${fks.length} item${fks.length === 1 ? '' : 's'}`);
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
                <OrderableEditor value={value.items} update={update.items} Inner={FillView} />
            </Expandable>
        </div>
    );
};

const FillView = ({update, value}: {update: Updater<FillOrLine>; value: FillOrLine}) => {
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
    value: State;
    update: Updater<State>;
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
                    Entities
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
    const value = useValue(state.$);
    const nodes = useMemo((): Record<string, TreeNode> => {
        const nodes: Record<string, TreeNode> = {};

        const addEntity = (entity: Entity): string => {
            switch (entity.type) {
                case 'Group':
                    return addGroup(entity);
                case 'Pattern':
                    return addPattern(entity);
                case 'Object':
                    return addObject(entity);
            }
        };

        const addObject = (object: EObject) => {
            const id = object.id + ':object';
            nodes[id] = {
                id,
                kind: 'Object',
                childKinds: [],
                children: [],
                name: 'Object ' + object.id,
                rightIcons: [],
            };
            return id;
        };

        const addPattern = (pattern: Pattern): string => {
            const id = pattern.id + ':pattern';
            nodes[id] = {
                id,
                kind: 'Pattern',
                childKinds: ['PatternContents'],
                children: [],
                name: 'Pattern ' + pattern.id,
                rightIcons: [],
            };
            return id;
        };

        const addGroup = (group: Group): string => {
            const id = group.id + ':group';
            nodes[id] = {
                id,
                name: 'Group ' + group.id,
                children: orderedIds(group.entities)
                    .map((eid) => value.entities[eid])
                    .filter((entity): entity is Entity => !!entity)
                    .map(addEntity),
                kind: 'Group',
                childKinds: ['Pattern', 'Group', 'Object'],
                rightIcons: [],
            };
            return id;
        };

        const rootGroup = value.entities[value.rootGroup];
        if (rootGroup?.type !== 'Group') {
            nodes[value.rootGroup] = {
                id: value.rootGroup,
                name: 'Invalid Root Group',
                children: [],
                kind: 'Invalid',
                childKinds: ['Group', 'Pattern', 'Object'],
                rightIcons: [],
            };
            return nodes;
        }
        addGroup(rootGroup);

        return nodes;
    }, [value]);
    const actions = useMemo((): TreeActions => {
        return {
            move(id, parent, newParent, order) {},
            insert(id, parent, order) {},
            delete(id, parent) {},
            rename(id, name) {},
            add(kind, parent, subKind) {},
            subKinds: {
                PatternContents: ['shapes', 'weave', 'lines', 'layers'],
            },
        };
    }, []);

    return <TreeView actions={actions} nodes={nodes} root={value.rootGroup + ':group'} />;
};
