import React from 'react';
import { Bounds } from '../editor/Export';
import { BlurInt } from '../editor/Forms';
import { Action } from '../state/Action';
import { State } from '../types';
import { pxToMM } from './generateGcode';

export function Settings({
    state,
    dispatch,
    bounds,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
    bounds: Bounds | null;
}) {
    return (
        <div>
            PPI:
            <BlurInt
                value={state.meta.ppi}
                onChange={(ppi) =>
                    ppi
                        ? dispatch({
                              type: 'meta:update',
                              meta: { ...state.meta, ppi },
                          })
                        : null
                }
                label={(ppi) => showBounds(bounds, ppi)}
            />
            Clear Height:
            <BlurInt
                value={state.gcode.clearHeight}
                onChange={(clearHeight) =>
                    clearHeight
                        ? dispatch({
                              type: 'gcode:config',
                              config: { clearHeight },
                          })
                        : null
                }
            />
            Pause Height:
            <BlurInt
                value={state.gcode.pauseHeight}
                onChange={(pauseHeight) =>
                    pauseHeight
                        ? dispatch({
                              type: 'gcode:config',
                              config: { pauseHeight },
                          })
                        : null
                }
            />
        </div>
    );
}

export function showBounds(
    bounds: Bounds | null,
    ppi: number,
): React.ReactNode {
    return (
        <div style={{ marginTop: 8, marginBottom: 16 }}>
            Content Size:{' '}
            {bounds ? pxToMM(bounds.x2 - bounds.x1, ppi).toFixed(1) : 'unknown'}
            {'mm x '}
            {bounds ? pxToMM(bounds.y2 - bounds.y1, ppi).toFixed(1) : 'unknown'}
            {'mm  '}
            {bounds
                ? (pxToMM(bounds.x2 - bounds.x1, ppi) / 25).toFixed(2)
                : 'unknown'}
            {'" x '}
            {bounds
                ? (pxToMM(bounds.y2 - bounds.y1, ppi) / 25).toFixed(2)
                : 'unknown'}
            "
        </div>
    );
}
