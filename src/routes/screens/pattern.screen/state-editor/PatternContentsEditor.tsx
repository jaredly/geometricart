import React, {useState, useEffect} from 'react';
import {Color, PatternContents, AnimatableCoord, ShapeKind, BaseKind} from '../export-types';
import {AnimCoordInput} from './AnimCoordInput';
import {JsonEditor} from './JsonEditor';
import {NumberField} from './NumberField';
import {ShapeStylesEditor} from './ShapeStylesEditor';
import {Updater} from '../../../../json-diff/Updater';
import {BaseKindEditor, ShapeKindEditor} from './BaseKindEditor';
import {AnimInput, AnimValueInput} from './AnimInput';
import {SharedEditor} from './SharedEditor';

export const PatternContentsEditor = ({
    value,
    palette,
    update,
}: {
    palette: Color[];
    value: PatternContents;
    update: Updater<PatternContents>;
}) => {
    // const [type, setType] = useState<PatternContents['type']>(value.type);
    // useEffect(() => {
    //     setType(value.type);
    // }, [value.type]);
    // <div className="rounded border border-base-300 p-3 bg-base-100 space-y-3">

    return (
        <details className="space-y-4 p-4 border border-base-300">
            <summary className="font-semibold text-sm gap-4 items-center">Contents</summary>
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <select
                    className="select select-bordered w-full md:w-auto"
                    value={value.type}
                    onChange={(evt) => {
                        const nextType = evt.target.value as PatternContents['type'];
                        if (nextType === value.type) return;
                        update(swapType(nextType));
                    }}
                >
                    <option value="shapes">Shapes</option>
                    <option value="weave">Weave</option>
                    <option value="lines">Lines</option>
                    <option value="layers">Layers</option>
                </select>
            </div>
            {value.type === 'layers' ? (
                <div className="space-y-2">
                    <AnimCoordInput
                        label="Origin"
                        value={value.origin}
                        onChange={(origin: AnimatableCoord | undefined | null) =>
                            origin != null ? update.variant('layers').origin(origin) : undefined
                        }
                    />
                    <label className="label cursor-pointer gap-2">
                        <span className="label-text text-sm">Reverse</span>
                        <input
                            className="checkbox"
                            type="checkbox"
                            checked={!!value.reverse}
                            onChange={(evt) => update.variant('layers').reverse(evt.target.checked)}
                        />
                    </label>
                    <ShapeStylesEditor<BaseKind>
                        palette={palette}
                        styles={value.styles}
                        update={update.variant('layers').styles}
                        KindEditor={BaseKindEditor}
                        defaultKind={{type: 'everything'}}
                    />
                    <SharedEditor
                        shared={value.shared}
                        onChange={update.variant('layers').shared}
                    />

                    {/* <JsonEditor
                        label="Styles"
                        value={value.styles}
                        onChange={(styles) =>
                            onChange({
                                ...value,
                                styles: styles as typeof value.styles,
                            })
                        }
                    /> */}
                </div>
            ) : null}
            {value.type === 'weave' ? (
                <div className="space-y-2">
                    <NumberField
                        label="Flip"
                        value={value.flip ?? 0}
                        onChange={update.variant('weave').flip}
                    />
                    <ShapeStylesEditor<BaseKind>
                        palette={palette}
                        styles={value.styles}
                        update={update.variant('weave').styles}
                        KindEditor={BaseKindEditor}
                        defaultKind={{type: 'everything'}}
                    />
                    <SharedEditor shared={value.shared} onChange={update.variant('weave').shared} />
                </div>
            ) : null}
            {value.type === 'shapes' ? (
                <ShapeStylesEditor<ShapeKind>
                    palette={palette}
                    styles={value.styles}
                    update={update.variant('shapes').styles}
                    KindEditor={ShapeKindEditor}
                    defaultKind={{type: 'everything'}}
                />
            ) : null}
            {value.type === 'lines' ? (
                <>
                    <AnimValueInput
                        label="Sort"
                        onChange={(v) =>
                            v == null
                                ? update.variant('lines').sort.remove()
                                : update.variant('lines').sort(v)
                        }
                        value={value.sort}
                    />
                    <ShapeStylesEditor<BaseKind>
                        palette={palette}
                        styles={value.styles}
                        update={update.variant('lines').styles}
                        KindEditor={BaseKindEditor}
                        defaultKind={{type: 'everything'}}
                    />
                </>
            ) : null}
        </details>
    );
};

const swapType = (nextType: PatternContents['type']): PatternContents => {
    switch (nextType) {
        case 'shapes':
            return {
                type: 'shapes',
                styles: {
                    style1: {
                        id: 'style1',
                        kind: {type: 'everything'},
                        lines: {
                            line1: {
                                id: 'line1',
                                mods: [],
                                color: {r: 255, g: 0, b: 0},
                                width: 1,
                            },
                        },
                        fills: {},
                        mods: [],
                        order: 0,
                    },
                },
            };
        case 'weave':
            return {
                type: 'weave',
                orderings: {},
                styles: {
                    line1: {
                        id: 'line1',
                        kind: {type: 'everything'},
                        mods: [],
                        order: 0,
                        lines: {
                            line1: {
                                id: 'line1',
                                mods: [],
                                color: 'black',
                                width: 10,
                            },
                            line2: {
                                id: 'line2',
                                mods: [],
                                color: 0,
                                width: 5,
                            },
                        },
                        fills: {},
                    },
                },
            };
        case 'lines':
            return {
                type: 'lines',
                styles: {
                    style1: {
                        id: 'style1',
                        kind: {type: 'everything'},
                        lines: {
                            line1: {
                                id: 'line1',
                                mods: [],
                                color: 'groupId',
                                width: 1,
                            },
                        },
                        fills: {},
                        mods: [],
                        order: 0,
                    },
                },
            };
        case 'layers':
            return {
                type: 'layers',
                origin: {x: 0, y: 0},
                reverse: false,
                styles: {
                    style1: {
                        id: 'style1',
                        kind: {type: 'everything'},
                        fills: {
                            fill1: {
                                id: 'fill1',
                                mods: [],
                                color: 0,
                                opacity: 0.1,
                            },
                        },
                        lines: {},
                        mods: [],
                        order: 0,
                    },
                },
            };
    }
    throw new Error('nope not');
};
