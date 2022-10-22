import React, { useState } from 'react';
import { Bounds } from '../editor/Export';
import { generateGcode, generateLaserInset, pxToMM } from './generateGcode';
import { initialState } from '../state/initialState';
import { State } from '../types';
import { Visualize } from './Visualize';
import { PathKit } from 'pathkit-wasm';

export function Toolbar({
    state,
    bounds,
    w,
    h,
    PathKit,
}: {
    state: State;
    bounds: Bounds | null;
    w: number;
    h: number;
    PathKit: PathKit;
}) {
    const [url, setUrl] = useState(
        null as null | { time: number; url: string; text: string },
    );
    const [laserUrl, setLaserUrl] = useState(
        null as null | { svg: string; url: string },
    );

    return (
        <div>
            <button
                onClick={() => {
                    generateLaserInset(state).then((svg) => {
                        if (!bounds) {
                            throw new Error('no bounds');
                        }
                        const blob = new Blob(
                            [wrapSvg(bounds, state, w, h, svg)],
                            { type: 'image/svg+xml' },
                        );
                        const url = URL.createObjectURL(blob);
                        setLaserUrl({ svg, url });
                    });
                }}
            >
                Generate Laser
            </button>
            <button
                onClick={() => {
                    try {
                        const { time, text } = generateGcode(state, PathKit);
                        const blob = new Blob(
                            [
                                text +
                                    '\n' +
                                    ';; ** STATE **\n;; ' +
                                    JSON.stringify({
                                        ...state,
                                        history: initialState.history,
                                    }),
                            ],
                            { type: 'text/plain' },
                        );
                        setUrl({ time, url: URL.createObjectURL(blob), text });
                    } catch (err) {
                        console.error(err);
                    }
                }}
            >
                Generate gcode
            </button>
            {url ? (
                <>
                    <a
                        onClick={() => setUrl(null)}
                        href={url.url}
                        style={{ color: 'white', margin: '0 8px' }}
                        download={
                            'geo-' + new Date().toISOString() + '-geo.gcode'
                        }
                    >
                        Download the gcode
                    </a>
                    {url.time.toFixed(2)} minutes?
                </>
            ) : null}
            {laserUrl ? (
                <>
                    <a
                        onClick={() => setLaserUrl(null)}
                        href={laserUrl.url}
                        style={{ color: 'white', margin: '0 8px' }}
                        download={
                            'geo-' + new Date().toISOString() + '-geo.svg'
                        }
                    >
                        Download the laser svg
                    </a>
                </>
            ) : null}
            <div>
                {laserUrl && bounds
                    ? // <div dangerouslySetInnerHTML={{ __html: laserUrl.svg }} />
                      showLaserSvg(bounds, state, w, h, laserUrl)
                    : null}
            </div>
            {url ? <Visualize gcode={url.text} /> : null}
        </div>
    );
}

export function showLaserSvg(
    bounds: Bounds,
    state: State,
    w: number,
    h: number,
    laserUrl: { svg: string; url: string },
): React.ReactNode {
    return (
        <svg
            width={
                pxToMM(bounds.x2 - bounds.x1, state.meta.ppi).toFixed(1) + 'mm'
            }
            height={
                pxToMM(bounds.y2 - bounds.y1, state.meta.ppi).toFixed(1) + 'mm'
            }
            viewBox={`0 0 ${w} ${h}`}
        >
            <path
                d={laserUrl.svg}
                stroke="red"
                fill="none"
                strokeWidth={2}
                transform={`translate(${w / 2},${h / 2})`}
            />
        </svg>
    );
}

export function wrapSvg(
    bounds: Bounds,
    state: State,
    w: number,
    h: number,
    svg: string,
): BlobPart {
    return `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="${
            pxToMM(bounds.x2 - bounds.x1, state.meta.ppi).toFixed(1) + 'mm'
        }"
        height="${
            pxToMM(bounds.y2 - bounds.y1, state.meta.ppi).toFixed(1) + 'mm'
        }"
        viewBox="0 0 ${w} ${h}"
    >
        <path
            d="${svg}"
            stroke="red"
            fill="none"
            strokeWidth="2"
            transform="translate(${w / 2},${h / 2})"
        />
    </svg>`;
}
