import React, {useState} from 'react';
import {EyeInvisibleIcon, EyeIcon} from '../../../../icons/Eyes';
import {Box, Color, ShapeStyle, TChunk} from '../export-types';
import {createFill, createLine} from './createLayerTemplate';
import {NumberField} from './NumberField';
import {LineEditor} from './LineEditor';
import {FillEditor} from './FillEditor';
import {SubStyleList} from './SubStyleList';
import {BaseKindEditor} from './BaseKindEditor';
import {BlurInput} from './BlurInput';
import {easeFn, easeFunctions} from '../evalEase';
import {
    ChevronUp12,
    DotsHorizontalOutline,
    DragMove2Fill,
    SelectDragIcon,
} from '../../../../icons/Icon';
import {HandleProps} from './DragToReorderList';
import {shapeD} from '../../../shapeD';
import {Coord} from '../../../../types';

const showEase = (ease?: string) => {
    const f = easeFn(ease ?? '');
    const pts: Coord[] = [];
    for (let i = 0; i <= 20; i++) {
        pts.push({
            x: i / 20,
            y: 1 - f(i / 20),
        });
    }
    return pts;
};

const box = (box: Box) => [
    {x: box.x, y: box.y},
    {x: box.x + box.width, y: box.y},
    {x: box.x + box.width, y: box.y + box.height},
    {x: box.x, y: box.y + box.height},
];

const boxes = (pos: Coord, w: number, total: number) => {
    const shapes: Coord[][] = [];
    const oscale = w / total;
    const scale = Math.min(oscale, 0.5);
    const offset = (w - scale * total) / 2;
    for (let i = 0; i < total; i++) {
        shapes.push(
            box({x: pos.x + scale * i + offset, y: pos.y - scale, width: scale, height: scale}),
        );
    }
    return shapes;
};

const ChunkEditor = ({chunk, onChange}: {chunk?: TChunk; onChange: (v?: TChunk) => void}) => {
    return (
        <details className={'dropdown'}>
            <summary className="btn">
                t=
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 2 2"
                    style={{width: 32, height: 32}}
                >
                    <path
                        stroke="#fff"
                        strokeWidth={0.05}
                        fill="none"
                        d={shapeD(
                            showEase(chunk?.ease).map(({x, y}) =>
                                chunk ? {x: x + 0.5, y: y + 0.2} : {x: x + 0.5, y: y + 0.5},
                            ),
                            false,
                        )}
                    />
                    {chunk
                        ? boxes({x: 0.1, y: 1.9}, 1.8, chunk.total).map((shape, i) => (
                              <path
                                  fill={i === chunk.chunk - 1 ? 'white' : 'none'}
                                  d={shapeD(shape)}
                                  stroke="white"
                                  strokeWidth={0.02}
                                  key={i}
                              />
                          ))
                        : undefined}
                </svg>
            </summary>
            <div className="dropdown-content mt-1 bg-base-200 p-2 border border-base-300 rounded-sm shadow flex flex-row gap-2">
                <BlurInput
                    className="input input-sm w-15 text-center"
                    placeholder="chunk"
                    value={chunk ? `${chunk.chunk}/${chunk.total}` : ''}
                    onChange={(value) => {
                        const [left, right] = value
                            .trim()
                            .split('/')
                            .map((n) => Number(n));
                        if (
                            Number.isFinite(left) &&
                            Number.isInteger(left) &&
                            Number.isFinite(right) &&
                            Number.isInteger(right)
                        ) {
                            onChange(
                                chunk
                                    ? {...chunk, chunk: left, total: right}
                                    : {chunk: left, total: right, ease: ''},
                            );
                        } else {
                            onChange(undefined);
                        }
                    }}
                />
                {chunk && (
                    <select
                        className="select select-sm w-20"
                        value={chunk.ease}
                        onChange={(evt) => onChange({...chunk, ease: evt.target.value})}
                    >
                        <option value="">straight</option>
                        {Object.keys(easeFunctions).map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </details>
    );
};

export const ShapeStyleCard = ({
    value,
    onChange,
    onRemove,
    palette,
    handleProps,
}: {
    palette: Color[];
    handleProps: HandleProps;
    value: ShapeStyle;
    onChange: (next: ShapeStyle) => void;
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

                        <ChunkEditor chunk={value.t} onChange={(t) => onChange({...value, t})} />
                        <div className="flex-1" />
                        <button
                            className="btn btn-square btn-sm"
                            onClick={(evt) => {
                                evt.stopPropagation();
                                onChange({...value, disabled: !value.disabled});
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
                    <BaseKindEditor
                        label="Kind"
                        value={value.kind}
                        onChange={(kind) => onChange({...value, kind})}
                    />
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
                            render={(key, fill, update, remove) => (
                                <FillEditor
                                    value={fill}
                                    onChange={update}
                                    onRemove={remove}
                                    palette={palette}
                                />
                            )}
                            onChange={(fills) => onChange({...value, fills})}
                        />
                        <SubStyleList
                            label="Lines"
                            emptyLabel="No lines"
                            items={value.lines}
                            createItem={createLine}
                            render={(key, line, update, remove) => (
                                <LineEditor
                                    palette={palette}
                                    value={line}
                                    onChange={update}
                                    onRemove={remove}
                                />
                            )}
                            onChange={(lines) => onChange({...value, lines})}
                        />
                    </div>
                )}
                {/* <ModsEditor value={value.mods} onChange={(mods) => onChange({...value, mods})} /> */}
            </div>
        </div>
    );
};
