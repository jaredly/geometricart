import React, {useState} from 'react';
import {EyeInvisibleIcon, EyeIcon} from '../../../../icons/Eyes';
import {Color, ShapeKind, ShapeStyle} from '../export-types';
import {createFill, createLine} from './createLayerTemplate';
import {NumberField} from './NumberField';
import {LineEditor} from './LineEditor';
import {FillEditor, ModsEditor} from './FillEditor';
import {SubStyleList} from './SubStyleList';
import {BaseKindEditor} from './BaseKindEditor';
import {
    AddIcon,
    ChevronUp12,
    DotsHorizontalOutline,
    DragMove2Fill,
    SelectDragIcon,
} from '../../../../icons/Icon';
import {HandleProps} from './DragToReorderList';
import {Updater} from '../../../../json-diff/Updater';
import {ChunkEditor} from './ChunkEditor';

export const ShapeStyleCard = ({
    value,
    update,
    onRemove,
    palette,
    handleProps,
}: {
    palette: Color[];
    handleProps: HandleProps;
    value: ShapeStyle;
    update: Updater<ShapeStyle>;
    onRemove: () => void;
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
                        <button
                            className="btn btn-square btn-sm"
                            onClick={(evt) => {
                                evt.stopPropagation();
                                update.disabled.replace(!value.disabled);
                            }}
                        >
                            {value.disabled ? <EyeInvisibleIcon color="gray" /> : <EyeIcon />}
                        </button>
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
                    <KindOrKinds value={value.kind} update={update.kind} />
                </div>
                <button className="btn w-full btn-xs" onClick={() => setShow(!show)}>
                    {show ? <ChevronUp12 /> : <DotsHorizontalOutline />}
                </button>
                {show && (
                    <div className="flex flex-col gap-3">
                        <SubStyleList
                            label="Fills"
                            emptyLabel="No fills"
                            items={value.fills}
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
                            update={update.fills}
                        />
                        <SubStyleList
                            label="Lines"
                            emptyLabel="No lines"
                            items={value.lines}
                            createItem={createLine}
                            render={(key, line, update, reId) => (
                                <LineEditor
                                    key={key}
                                    reId={reId}
                                    palette={palette}
                                    value={line}
                                    update={update}
                                />
                            )}
                            update={update.lines}
                        />
                        <ModsEditor palette={palette} mods={value.mods} update={update.mods} />
                    </div>
                )}
            </div>
        </div>
    );
};

const KindOrKinds = ({
    value,
    update,
}: {
    value: ShapeKind | ShapeKind[];
    // onChange: (next: ShapeKind | ShapeKind[]) => void;
    update: Updater<ShapeKind | ShapeKind[]>;
}) => {
    const kinds = Array.isArray(value) ? value : [value];
    return (
        <div className="bg-base-200 rounded-lg p-3 border border-base-300 space-y-2">
            <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Kind</div>
                <button
                    onClick={() => {
                        if (Array.isArray(value)) {
                            const res = kinds.slice();
                            res.push({type: 'everything'});
                            update.single(false).push({type: 'everything'});
                        } else {
                            update.replace([value, {type: 'everything'}]);
                        }
                    }}
                    className="btn btn-square"
                >
                    <AddIcon />
                </button>
                {kinds.length >= 1 ? (
                    <BaseKindEditor value={kinds[0]} update={update.single(true)} />
                ) : null}
            </div>
            {kinds.slice(1).map((kind, i) => {
                return (
                    <div key={i}>
                        <button
                            onClick={() => {
                                update.single(false)[i + 1].remove();
                            }}
                            className="btn btn-square text-red-400"
                        >
                            &times;
                        </button>
                        <BaseKindEditor value={kind} update={update.single(false)[i + 1]} />
                    </div>
                );
            })}
        </div>
    );
};
