import {CogIcon, ObjectUngroup} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {
    AnimatableColor,
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
import {orderedIds, orderedItems} from '../state-editor/nextOrder';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {EntityView} from './EntityView';
import {Expandable} from './Expandable';
import {DisabledIcon} from './DisabledIcon';
import {TreeActions, TreeNode, TreeView} from './TreeView';
import {useCallback, useMemo, useState} from 'react';
import {State} from '../types/state-type';
import {colorToString, parseColor} from '../utils/colors';

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

// config hereeeee
type Item =
    | {type: 'group'; id: string}
    | {type: 'style-group'; id: string}
    | {type: 'pattern'; pattern: Pattern}
    | {type: 'render'; id: string; style: string}
    | {type: 'object'; object: EObject}
    | {
          type: 'pattern-contents';
          pattern: Pattern;
          contents: PatternContents;
      };

const itemToString = (item: Item): string => {
    switch (item.type) {
        case 'object':
            return `object:${item.object.id}`;
        case 'group':
            return `group:${item.id}`;
        case 'style-group':
            return `style-group:${item.id}`;
        case 'pattern':
            return `pattern:${item.pattern.id}`;
        case 'render':
            return `render:${item.id}:${item.style}`;
        case 'pattern-contents':
            return `pattern:${item.pattern.id}:${item.contents.id}`;
    }
};

export const LayerEditor = () => {
    const state = useExportState();
    const value = useValue(state.$);
    const [config, setConfig] = useState<null | Item>(null);

    const StyleIcons = useCallback(
        (kind: Item) => {
            return (
                <CogIcon
                    onClick={(evt) => {
                        evt.stopPropagation();
                        setConfig(
                            config && itemToString(config) === itemToString(kind) ? null : kind,
                        );
                    }}
                    className={
                        'cursor-pointer ease-linear transition-colors ' +
                        (config && itemToString(config) === itemToString(kind) ? 'text-accent' : '')
                    }
                />
            );
        },
        [config],
    );

    const {ids, nodes} = useMemo(() => {
        const ids: Record<string, Item> = {};
        const nodes: Record<string, TreeNode<Item>> = {};

        const add = (node: TreeNode<Item>) => {
            nodes[itemToString(node.id)] = node;
            ids[itemToString(node.id)] = node.id;
            return itemToString(node.id);
        };

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

        const addObject = (object: EObject) =>
            add({
                id: {type: 'object', object},
                childKinds: [],
                children: [],
                name: 'Object ' + object.id,
            });

        const colorPreview = (color?: AnimatableColor) => {
            if (!color) return;
            let parsed =
                typeof color === 'number'
                    ? value.styleConfig.palette[color % value.styleConfig.palette.length]
                    : parseColor(color);
            if (parsed) {
                return (
                    <div style={{width: 20, height: 20, backgroundColor: colorToString(parsed)}} />
                );
            }
        };

        const addPatternContents = (pattern: Pattern, contents: PatternContents) => {
            let children: string[] = [];
            let childKinds: string[] = [];
            switch (contents.type) {
                case 'shapes': {
                    children = orderedItems(contents.styles).map((item) =>
                        add({
                            id: {type: 'style-group', id: item.id},
                            // item.id + ':' + contents.id + ':' + pattern.id,
                            // kind: 'Style',
                            childKinds: ['FillOrLine'],
                            children: orderedItems(item.items).map((render) =>
                                add({
                                    id: {type: 'render', style: item.id, id: render.id},
                                    childKinds: [],
                                    children: [],
                                    name: render.line ? 'line' : 'fill',
                                    rightIcons: StyleIcons,
                                    preview: colorPreview(render.color),
                                }),
                            ),
                            name: 'Style group ' + item.id,
                        }),
                    );
                    childKinds = ['style-group'];
                    break;
                }
                case 'weave':
                case 'lines':
                case 'layers':
            }
            return add({
                id: {type: 'pattern-contents', contents, pattern},
                childKinds,
                children,
                name: contents.type,
            });
        };

        const addPattern = (pattern: Pattern): string =>
            add({
                id: {type: 'pattern', pattern},
                childKinds: ['PatternContents'],
                children: orderedItems(pattern.contents).map((contents) =>
                    addPatternContents(pattern, contents),
                ),
                name: 'Pattern ' + pattern.id,
            });

        const addGroup = (group: Group): string =>
            add({
                id: {type: 'group', id: group.id},
                name: 'Group ' + group.id,
                children: orderedIds(group.entities)
                    .map((eid) => value.entities[eid])
                    .filter((entity): entity is Entity => !!entity)
                    .map(addEntity),
                childKinds: ['Pattern', 'Group', 'Object'],
            });

        const rootGroup = value.entities[value.rootGroup];
        if (rootGroup?.type !== 'Group') {
            nodes.invalid = {
                id: {type: 'group', id: value.rootGroup},
                name: 'Invalid Root Group',
                children: [],
                childKinds: ['Group', 'Pattern', 'Object'],
            };
            return {ids, nodes};
        }
        addGroup(rootGroup);

        return {ids, nodes};
    }, [value, StyleIcons]);

    const actions = useMemo((): TreeActions<Item> => {
        return {
            move(id, parent, newParent, order) {},
            insert(id, parent, order) {},
            delete(id, parent) {},
            rename(id, name) {},
            add(kind, parent, subKind) {},
            subKinds: {
                PatternContents: ['shapes', 'weave', 'lines', 'layers'],
                FillOrLine: ['fill', 'line'],
            },
        };
    }, []);
    const [selection, setSelection] = useState<null | string[]>(null);

    return (
        <div>
            <div className="flex-1 min-h-0 overflow-auto">
                <TreeView<Item>
                    kindToString={itemToString}
                    selection={selection}
                    setSelection={setSelection}
                    actions={actions}
                    nodes={nodes}
                    root={itemToString({type: 'group', id: value.rootGroup})}
                />
            </div>
            {config ? (
                <RenderConfig config={config} onClose={() => setSelection(null)} value={value} />
            ) : null}
        </div>
    );
};

const RenderConfig = ({config, onClose}: {value: State; config: Item; onClose(): void}) => {
    return <div>Seelction</div>;
};
