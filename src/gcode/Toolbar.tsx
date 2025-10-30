import React, {useState} from 'react';
import {Bounds} from '../editor/Export';
import {generateGcode, generateLaserInset} from './generateGcode';
import {pxToMM} from './pxToMM';
import {initialState} from '../state/initialState';
import {State} from '../types';
import {Visualize} from './Visualize';
import {PathKit} from 'pathkit-wasm';

export const gcodeStateSuffix = (state: State) =>
    '\n;; ** STATE **\n;; ' +
    JSON.stringify({
        ...state,
        history: initialState.history,
    });

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
    const [laserUrl, setLaserUrl] = useState(null as null | {svg: string; url: string});
    const [showGcode, setShowGcode] = useState(true);

    const generated = React.useMemo(() => {
        if (!showGcode) {
            return null;
        }

        try {
            const now = Date.now();
            const {time, text} = generateGcode(state, PathKit);
            console.log(`Gcode generation, ${((Date.now() - now) / 1000).toFixed(2)}sec`);
            const blob = new Blob([text + gcodeStateSuffix(state)], {
                type: 'text/plain',
            });
            return {time, url: URL.createObjectURL(blob), text};
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [state.view, state.paths, state.pathGroups, state.gcode, state.meta, bounds, showGcode]);

    return (
        <div>
            <button
                onClick={() => {
                    const svg = generateLaserInset(state);
                    if (!bounds) {
                        throw new Error('no bounds');
                    }
                    const blob = new Blob([wrapSvg(bounds, state, svg)], {
                        type: 'image/svg+xml',
                    });
                    const url = URL.createObjectURL(blob);
                    setLaserUrl({svg, url});
                }}
            >
                Generate Laser
            </button>
            <button onClick={() => setShowGcode(!showGcode)}>Generate gcode</button>
            {showGcode && generated ? (
                <>
                    <a
                        href={generated.url}
                        style={{color: 'white', margin: '0 8px'}}
                        download={'geo-' + new Date().toISOString() + '-geo.gcode'}
                    >
                        Download the gcode
                    </a>
                    {generated.time.toFixed(2)} minutes?
                </>
            ) : null}
            {laserUrl ? (
                <>
                    <a
                        onClick={() => setLaserUrl(null)}
                        href={laserUrl.url}
                        style={{color: 'white', margin: '0 8px'}}
                        download={'geo-' + new Date().toISOString() + '-geo.svg'}
                    >
                        Download the laser svg
                    </a>
                </>
            ) : null}
            <div>{laserUrl && bounds ? showLaserSvg(bounds, state, w, h, laserUrl) : null}</div>
            {showGcode && generated ? (
                <Visualize gcode={generated.text} time={generated.time} state={state} />
            ) : null}
        </div>
    );
}

function showLaserSvg(
    bounds: Bounds,
    state: State,
    w: number,
    h: number,
    laserUrl: {svg: string; url: string},
): React.ReactNode {
    return (
        <svg
            width={pxToMM(bounds.x2 - bounds.x1, state.meta.ppi).toFixed(1) + 'mm'}
            height={pxToMM(bounds.y2 - bounds.y1, state.meta.ppi).toFixed(1) + 'mm'}
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

function wrapSvg(bounds: Bounds, state: State, svg: string): BlobPart {
    return `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="${pxToMM(bounds.x2 - bounds.x1, state.meta.ppi).toFixed(1) + 'mm'}"
        height="${pxToMM(bounds.y2 - bounds.y1, state.meta.ppi).toFixed(1) + 'mm'}"
        viewBox="0 0 ${bounds.x2 - bounds.x1} ${bounds.y2 - bounds.y1}"
    >
        <path
            d="${svg}"
            stroke="red"
            fill="none"
            strokeWidth="2"
            transform="translate(${(bounds.x2 - bounds.x1) / 2},${(bounds.y2 - bounds.y1) / 2})"
        />
    </svg>`;
}
