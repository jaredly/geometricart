import React from 'react';
import {Updater} from '../../../../json-diff/Updater';
import {Coord} from '../../../../types';
import {shapeD} from '../../../shapeD';
import {easeFn, easeFunctions} from '../eval/evalEase';
import {Box, TChunk} from '../export-types';
import {BlurInput} from './BlurInput';

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
            box({
                x: pos.x + scale * i + offset,
                y: pos.y - scale,
                width: scale,
                height: scale,
            }),
        );
    }
    return shapes;
};

export const ChunkEditor = ({
    chunk,
    update,
}: {
    chunk?: TChunk;
    update: Updater<TChunk | undefined>;
}) => {
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
            <div className="dropdown-content mt-1 bg-base-200 p-2 border border-white rounded-sm shadow flex flex-row gap-2">
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
                            update(
                                chunk
                                    ? {...chunk, chunk: left, total: right}
                                    : {chunk: left, total: right, ease: ''},
                            );
                        } else {
                            update.remove();
                        }
                    }}
                />
                {chunk && (
                    <select
                        className="select select-sm w-20"
                        value={chunk.ease}
                        onChange={(evt) => update.ease(evt.target.value)}
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
