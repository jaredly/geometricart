import '@react-three/fiber';
import React, { useState } from 'react';
import { State } from '../types';
import { addMetadata } from '../editor/ExportPng';
import { initialHistory } from '../state/initialState';
import { serializeObj } from './serialize-obj';

type SVGPath = {
    svg: string;
    bounds: { x0: number; x1: number; y0: number; y1: number };
};

export const ExportSection = ({
    canv,
    state,
    stls,
    backs,
    covers,
}: {
    canv: { current: HTMLCanvasElement | null };
    backs: SVGPath[];
    covers: SVGPath[];
    state: State;
    stls: {
        cells: [number, number, number][];
        positions: [number, number, number][];
    }[];
}) => {
    const [exurl, setExport] = useState(null as null | string);

    return (
        <>
            <div>
                <button
                    onClick={() => {
                        canv.current!.toBlob(async (blob) => {
                            blob = await addMetadata(blob, {
                                ...state,
                                history: initialHistory,
                            });
                            setExport(URL.createObjectURL(blob!));
                        });
                    }}
                >
                    Export image with state
                </button>
                <button
                    onClick={() => {
                        const node = document.createElement('a');
                        node.download = `group-${Date.now()}.obj`;

                        let off = 0;
                        const res = stls
                            .map(({ cells, positions }, i) => {
                                const txt = serializeObj(
                                    cells,
                                    positions,
                                    `item_${i}`,
                                    off,
                                );
                                off += positions.length;
                                return txt;
                            })
                            .join('\n');

                        node.href = URL.createObjectURL(
                            new Blob([res], { type: 'text/plain' }),
                        );
                        node.click();
                    }}
                >
                    Download .obj of the scene
                </button>
            </div>
            {exurl ? (
                <div>
                    <a href={exurl} download={`render-${Date.now()}.png`}>
                        <img
                            src={exurl}
                            style={{ maxWidth: 200, maxHeight: 200 }}
                        />
                    </a>
                    <button onClick={() => setExport(null)}>Clear</button>
                </div>
            ) : null}
        </>
    );
};
