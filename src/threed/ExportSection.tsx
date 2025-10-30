import '@react-three/fiber';
import React, {useState} from 'react';
import {State} from '../types';
import {addMetadata} from '../editor/ExportPng';
import {initialHistory} from '../state/initialState';
import {serializeObj} from './serialize-obj';
import {inToPX, mmToPX, pxToIn, pxToMM} from '../gcode/pxToMM';
import {BlurInt} from '../editor/Forms';

type SVGPath = {
    svg: string;
    bounds: {x: number; y: number; w: number; h: number};
};

export const ExportSection = ({
    canv,
    state,
    stls,
    backs,
    covers,
}: {
    canv: {current: HTMLCanvasElement | null};
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
                            .map(({cells, positions}, i) => {
                                const txt = serializeObj(cells, positions, `item_${i}`, off);
                                off += positions.length;
                                return txt;
                            })
                            .join('\n');

                        node.href = URL.createObjectURL(new Blob([res], {type: 'text/plain'}));
                        node.click();
                    }}
                >
                    Download .obj of the scene
                </button>
            </div>
            {exurl ? (
                <div>
                    <a href={exurl} download={`render-${Date.now()}.png`}>
                        <img src={exurl} style={{maxWidth: 200, maxHeight: 200}} />
                    </a>
                    <button onClick={() => setExport(null)}>Clear</button>
                </div>
            ) : null}
            <SVGPlates paths={backs} ppi={state.meta.ppi} title={state.meta.title || 'pattern'} />
            <SVGPlates
                paths={covers}
                ppi={state.meta.ppi}
                title={(state.meta.title || 'pattern') + '-covers'}
            />
        </>
    );
};

const groupPaths = (
    paths: SVGPath[],
    // gotta be mm ... or ... px actually
    width: number,
    height: number,
    margin: number,
    strokeWidth: number,
) => {
    const grouped: {
        items: JSX.Element[];
        x: number;
        y: number;
        y1: number;
    }[] = [{items: [], x: margin, y: margin, y1: margin * 2}];
    for (let path of paths) {
        let last = grouped[grouped.length - 1];
        if (last.x + path.bounds.w > width) {
            if (last.y1 + path.bounds.h > height) {
                last = {items: [], x: margin, y: margin, y1: margin * 2};
                grouped.push(last);
            } else {
                last.y = last.y1;
                last.x = margin;
            }
        }
        last.items.push(
            <path
                transform={`translate(${last.x - path.bounds.x} ${last.y - path.bounds.y})`}
                key={last.items.length}
                d={path.svg}
                stroke="red"
                fill="none"
                strokeWidth={strokeWidth}
            />,
        );
        last.x += path.bounds.w + margin;
        last.y1 = Math.max(last.y + path.bounds.h + margin, last.y1);
    }
    return grouped;
};

const SVGPlates = ({paths, ppi, title}: {title: string; paths: SVGPath[]; ppi: number}) => {
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(8);
    const [marginMM, setMarginMM] = useState(3);

    const grouped = groupPaths(
        paths,
        inToPX(width, ppi),
        inToPX(height, ppi),
        mmToPX(marginMM, ppi),
        ppi / 80,
    );

    return (
        <div>
            <label>
                Width
                <BlurInt value={width} onChange={(w) => (w != null ? setWidth(w) : null)} />
                in
            </label>
            <label style={{marginLeft: 8}}>
                Height
                <BlurInt value={height} onChange={(v) => (v != null ? setHeight(v) : null)} />
                in
            </label>
            <label style={{marginLeft: 8}}>
                Margin
                <BlurInt value={marginMM} onChange={(v) => (v != null ? setMarginMM(v) : null)} />
                mm
            </label>
            <div>
                {grouped.map((p, i) => (
                    <svg
                        key={i}
                        width={`${width}in`}
                        height={`${height}in`}
                        onClick={downloadSvg(title)}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={`${0} ${0} ${inToPX(width, ppi)} ${inToPX(height, ppi)}`}
                        style={{
                            margin: 8,
                            outline: '1px solid magenta',
                            display: 'block',
                            cursor: 'pointer',
                        }}
                    >
                        {p.items}
                    </svg>
                ))}
            </div>
        </div>
    );
};

const downloadSvg = (name: string) => (evt: React.MouseEvent<SVGSVGElement>) => {
    const data = evt.currentTarget.outerHTML;
    const blob = new Blob([data], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${name}-${Date.now()}.svg`;
    a.href = url;
    a.click();
};
