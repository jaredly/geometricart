import {CogIcon, ObjectUngroup} from '../../../../icons/Icon';
import {Extra, useValue} from '../../../../json-diff/react';
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
import {maxOrder, nextOrder, orderedIds, orderedItems} from '../state-editor/nextOrder';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {EntityView} from './EntityView';
import {Expandable} from './Expandable';
import {DisabledIcon} from './DisabledIcon';
import {TreeActions, TreeNode, TreeView} from './TreeView';
import {useCallback, useMemo, useState} from 'react';
import {State} from '../types/state-type';
import {colorToString, parseColor} from '../utils/colors';
import {FillEditor, ModsEditor} from '../state-editor/FillEditor';
import {BlurInput} from '../state-editor/BlurInput';
import {genid} from '../utils/genid';
import {ShapeKindEditor} from '../state-editor/BaseKindEditor';
import {KindOrKinds, KindSelector} from '../state-editor/ShapeStyleCard';
import {diffBuilder} from '../../../../json-diff/helper2';

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
    | {type: 'invalid'; path: Updater<number>}
    | {type: 'group'; path: Updater<Group>; value: Group}
    | {type: 'style-group'; path: Updater<ShapeStyle<ShapeKind>>; value: ShapeStyle<ShapeKind>}
    | {type: 'pattern'; path: Updater<Pattern>; value: Pattern}
    | {type: 'render'; path: Updater<FillOrLine>; value: FillOrLine}
    | {type: 'object'; path: Updater<EObject>; value: EObject}
    | {
          type: 'pattern-contents';
          path: Updater<PatternContents>;
          value: PatternContents;
      };

const itemToString = (item: Item): string => {
    return item.type === 'invalid' ? 'invalid' : item.path.toString();
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

        const addEntity = (entity: Entity, path: Updater<Entity>): string => {
            switch (entity.type) {
                case 'Group':
                    return addGroup(entity, path.$variant('Group'), state.$);
                case 'Pattern':
                    return addPattern(entity, path.$variant('Pattern'));
                case 'Object':
                    return addObject(entity, path.$variant('Object'));
            }
        };

        const addObject = (value: EObject, path: Updater<EObject>) =>
            add({
                id: {type: 'object', path, value},
                childKinds: [],
                children: [],
                name: 'Object ' + value.id,
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

        const addPatternContents = (path: Updater<PatternContents>, contents: PatternContents) => {
            let children: string[] = [];
            let childKinds: string[] = [];
            switch (contents.type) {
                case 'shapes': {
                    children = orderedItems(contents.styles).map((item) =>
                        add({
                            id: {
                                type: 'style-group',
                                value: item,
                                path: path.$variant('shapes').styles[item.id],
                            },
                            // item.id + ':' + contents.id + ':' + pattern.id,
                            // kind: 'Style',
                            rightIcons: StyleIcons,
                            childKinds: ['FillOrLine'],
                            children: orderedItems(item.items).map((render) =>
                                add({
                                    id: {
                                        type: 'render',
                                        path: path.$variant('shapes').styles[item.id].items[
                                            render.id
                                        ],
                                        value: render,
                                    },
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
                id: {type: 'pattern-contents', value: contents, path: path},
                childKinds,
                children,
                name: contents.type,
            });
        };

        const addPattern = (pattern: Pattern, path: Updater<Pattern>): string =>
            add({
                id: {type: 'pattern', value: pattern, path},
                childKinds: ['PatternContents'],
                children: orderedItems(pattern.contents).map((contents) =>
                    addPatternContents(path.contents[contents.id], contents),
                ),
                name: 'Pattern ' + pattern.id,
            });

        const addGroup = (group: Group, path: Updater<Group>, base: Updater<State>): string =>
            add({
                id: {type: 'group', value: group, path},
                name: 'Group ' + group.id,
                children: orderedIds(group.entities)
                    .map((eid) => value.entities[eid])
                    .filter((entity): entity is Entity => !!entity)
                    .map((entity) => addEntity(entity, base.entities[entity.id])),
                childKinds: ['Pattern', 'Group', 'Object'],
            });

        const rootGroup = value.entities[value.rootGroup];
        if (rootGroup?.type !== 'Group') {
            nodes.invalid = {
                id: {
                    type: 'invalid',
                    path: diffBuilder<number, Extra, 'type'>('type', {
                        getForPath() {
                            throw new Error('no');
                        },
                        listenToPath() {
                            throw new Error('no');
                        },
                    }),
                },
                name: 'Invalid Root Group',
                children: [],
                childKinds: ['Group', 'Pattern', 'Object'],
            };
            return {ids, nodes};
        }
        addGroup(rootGroup, state.$.entities[rootGroup.id].$variant('Group'), state.$);

        return {ids, nodes};
    }, [value, StyleIcons, state.$]);

    const actions = useMemo((): TreeActions<Item> => {
        return {
            move(id, parent, newParent, order) {},
            insert(id, parent, order) {},
            delete(id, parent) {},
            rename(id, name) {},
            add(kind, parent, subKind) {
                console.log(kind, parent.path.toString(), subKind);
                switch (parent.type) {
                    case 'style-group': {
                        const order = maxOrder(parent.value.items);
                        const id = genid();
                        parent.path.items[id].$add({
                            id,
                            order,
                            mods: [],
                            color: 0,
                            line:
                                subKind === 'line'
                                    ? {
                                          width: 1,
                                      }
                                    : undefined,
                        });
                        break;
                    }
                }
            },
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
                    root={state.$.entities[value.rootGroup].$variant('Group').toString()}
                />
            </div>
            {config ? (
                <div className="p-4 border-t border-r-amber-400 mt-4">
                    <RenderConfig
                        update={state.$}
                        config={config}
                        onClose={() => setSelection(null)}
                        key={config.path.toString()}
                        value={value}
                    />
                </div>
            ) : null}
        </div>
    );
};

const WithValue = <T,>({path, render}: {path: Updater<T>; render: (v: T) => React.ReactNode}) => {
    const value = useValue(path);
    return render(value);
};

const RenderConfig = ({
    config,
    update,
    onClose,
    value,
}: {
    update: Updater<State>;
    value: State;
    config: Item;
    onClose(): void;
}) => {
    const palette = useValue(update.styleConfig.palette);
    if (config.type === 'render') {
        return (
            <WithValue
                render={(fill) => (
                    <FillEditor
                        palette={value.styleConfig.palette}
                        reId={() => {}}
                        update={config.path}
                        value={fill}
                    />
                )}
                path={config.path}
            />
        );
    }
    if (config.type === 'style-group') {
        return (
            <WithValue
                path={config.path}
                render={(style) => (
                    <div>
                        <BlurInput value={style.id} onChange={config.path.id.$replace} />
                        <KindOrKinds
                            value={style.kind}
                            update={config.path.kind}
                            KindEditor={ShapeKindEditor}
                            Selector={KindSelector}
                        />
                        <ModsEditor mods={style.mods} update={config.path.mods} palette={palette} />
                    </div>
                )}
            />
        );
    }
    return <div>Some Selection... {config.type}</div>;
};
