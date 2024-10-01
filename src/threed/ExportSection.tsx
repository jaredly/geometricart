import '@react-three/fiber';
import React, { useState } from 'react';
import { State } from '../types';
import { addMetadata } from '../editor/ExportPng';
import { initialHistory } from '../state/initialState';
import { serializeObj } from './serialize-obj';
import { pxToMM } from '../gcode/generateGcode';

type SVGPath = {
    svg: string;
    bounds: { x: number; y: number; w: number; h: number };
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
            <SVGPlates paths={backs} ppi={state.meta.ppi} />
            <SVGPlates paths={covers} ppi={state.meta.ppi} />
        </>
    );
};

const groupPaths = (
    paths: SVGPath[],
    ppi: number,
    width: number,
    height: number,
) => {
    const margin = 5; // mm
    const grouped: {
        items: JSX.Element[];
        x: number;
        y: number;
    }[] = [{ items: [], x: 0, y: 0 }];
    for (let path of paths) {
    }
};

const SVGPlates = ({ paths, ppi }: { paths: SVGPath[]; ppi: number }) => {
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(8);

    const grouped = [];

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 800 }}>
            {paths.map((p, i) => (
                <svg
                    key={i}
                    width={pxToMM(p.bounds.w, ppi).toFixed(2) + 'mm'}
                    height={pxToMM(p.bounds.h, ppi).toFixed(2) + 'mm'}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox={`${p.bounds.x} ${p.bounds.y} ${p.bounds.w} ${p.bounds.h}`}
                    style={{ margin: 8 }}
                >
                    <path
                        d={p.svg}
                        stroke="red"
                        fill="none"
                        strokeWidth={p.bounds.h / 100}
                    />
                </svg>
            ))}
        </div>
    );
};
