import React, {useState} from 'react';
import {AddIcon, CogIcon, DragMove2Fill} from '../../../../icons/Icon';
import {Updater} from '../../../../json-diff/Updater';
import {BaseKind, Color, ShapeKind, ShapeStyle} from '../export-types';
import {DisabledIcon} from '../window/DisabledIcon';
import {ChunkEditor} from './ChunkEditor';
import {createFill} from './createLayerTemplate';
import {HandleProps} from './DragToReorderList';
import {FillEditor, ModsEditor} from './FillEditor';
import {SubStyleList} from './SubStyleList';

export const BaseKindSelector = ({
    value,
    onSelect,
}: {
    value?: BaseKind;
    onSelect(t: BaseKind): void;
}) => {
    return (
        <select
            value={value?.type ?? ''}
            onChange={(evt) => {
                switch (evt.target.value) {
                    case 'alternating':
                        if (value?.type !== 'alternating')
                            onSelect({type: 'alternating', index: 0});
                        return;
                    case 'explicit':
                        if (value?.type !== 'explicit') onSelect({type: 'explicit', ids: {}});
                        return;
                    case 'distance':
                        if (value?.type !== 'distance')
                            onSelect({
                                type: 'distance',
                                corner: 0,
                                distances: [0, 1],
                                repeat: true,
                            });
                        return;
                }
            }}
        >
            <option value="">Select a kind</option>
            {(['alternating', 'explicit', 'distance'] as const).map((t) => (
                <option key={t} value={t}>
                    {t}
                </option>
            ))}
        </select>
    );
};

export const KindSelector = ({
    value,
    onSelect,
}: {
    value?: ShapeKind;
    onSelect(t: ShapeKind): void;
}) => {
    return (
        <select
            value={value?.type}
            onChange={(evt) => {
                switch (evt.target.value) {
                    case 'alternating':
                        if (value?.type !== 'alternating')
                            onSelect({type: 'alternating', index: 0});
                        return;
                    case 'explicit':
                        if (value?.type !== 'explicit') onSelect({type: 'explicit', ids: {}});
                        return;
                    case 'shape':
                        if (value?.type !== 'shape')
                            onSelect({type: 'shape', key: '', rotInvariant: false});
                        return;
                    case 'distance':
                        if (value?.type !== 'distance')
                            onSelect({
                                type: 'distance',
                                corner: 0,
                                distances: [0, 1],
                                repeat: true,
                            });
                        return;
                }
            }}
        >
            <option value="">Select a kind</option>
            {(['alternating', 'explicit', 'shape', 'distance'] as const).map((t) => (
                <option key={t} value={t}>
                    {t}
                </option>
            ))}
        </select>
    );
};

export const ShapeStyleCard = <Kind,>({
    value,
    update,
    onRemove,
    palette,
    handleProps,
    KindEditor,
    KindSelector,
}: {
    palette: Color[];
    handleProps: HandleProps;
    value: ShapeStyle<Kind>;
    update: Updater<ShapeStyle<Kind>>;
    onRemove: () => void;
    KindEditor: React.ComponentType<{value: Kind; update: Updater<Kind>}>;
    KindSelector: React.ComponentType<{onSelect(v: Kind): void}>;
}) => {
    const [show, setShow] = useState(false);
    return (
        <div
            className={
                'bg-base-100 rounded-xl border border-base-300 ' +
                (handleProps.isActive ? 'bg-base-300 border-base-100 shadow-2xl' : '')
            }
        >
            <div className="p-3 space-y-3">
                <div className="flex flex-col gap-2">
                    <div
                        className="flex flex-row items-center gap-4"
                        style={value.disabled ? {color: 'gray'} : undefined}
                    >
                        <button
                            className="btn"
                            draggable
                            {...handleProps.props}
                            onClick={() => setShow(!show)}
                        >
                            <DragMove2Fill />
                        </button>

                        <ChunkEditor chunk={value.t} update={update.t} />
                        <div className="flex-1" />
                        <button className="btn btn-square" onClick={() => setShow(!show)}>
                            <CogIcon />
                        </button>
                        <DisabledIcon value={value.disabled} update={update.disabled} />
                        <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={(evt) => {
                                evt.stopPropagation();
                                onRemove();
                            }}
                        >
                            Remove
                        </button>
                    </div>
                </div>
                {show && (
                    <div className="flex flex-col gap-3">
                        <KindOrKinds<Kind>
                            KindEditor={KindEditor}
                            value={value.kind}
                            update={update.kind}
                            Selector={KindSelector}
                        />
                        <SubStyleList
                            label="Fills"
                            emptyLabel="No fills"
                            items={value.items}
                            createItem={createFill}
                            render={(key, fill, update, reId) => (
                                <FillEditor
                                    key={key}
                                    value={fill}
                                    update={update}
                                    reId={reId}
                                    palette={palette}
                                />
                            )}
                            update={update.items}
                        />
                        <ModsEditor palette={palette} mods={value.mods} update={update.mods} />
                    </div>
                )}
            </div>
        </div>
    );
};

export const KindOrKinds = <Kind,>({
    value,
    update,
    KindEditor,
    Selector,
}: {
    value: Kind[];
    update: Updater<Kind[]>;
    KindEditor: React.ComponentType<{value: Kind; update: Updater<Kind>}>;
    Selector: React.ComponentType<{onSelect(v: Kind): void}>;
}) => {
    return (
        <div className="bg-base-200 rounded-lg p-3 border border-base-300 space-y-2">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Kind</div>
                <Selector onSelect={(v) => update.$push(v)} />
            </div>
            {value.map((kind, i) => {
                return (
                    <div key={i}>
                        <button
                            onClick={() => update[i].$remove()}
                            className="btn btn-square text-red-400"
                        >
                            &times;
                        </button>
                        <KindEditor value={kind} update={update[i]} />
                    </div>
                );
            })}
        </div>
    );
};
