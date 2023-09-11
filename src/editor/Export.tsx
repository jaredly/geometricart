/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { BlurInt, Text, Toggle } from './Forms';
import { transparent } from './Icons';
import { angleBetween } from '../rendering/findNextSegments';
import { sortedVisibleInsetPaths } from '../rendering/sortedVisibleInsetPaths';
import { Action } from '../state/Action';
import { State } from '../types';
import { PendingBounds, newPendingBounds, addCoordToBounds } from './Bounds';
import { MultiColor, constantColors, maybeUrlColor } from './MultiStyleForm';
import { UIState } from '../useUIState';
import { getClips } from '../rendering/pkInsetPaths';
import { ExportSVG } from './ExportSVG';
import { ExportPng } from './ExportPng';
import { applyMatrix } from '../rendering/getMirrorTransforms';
import { EditorState } from './Canvas';

export type Bounds = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export const findBoundingRect = (state: State): Bounds | null => {
    const clip = getClips(state);

    let bounds: PendingBounds = newPendingBounds();
    // NOTE: This won't totally cover arcs, but that's just too bad folks.
    sortedVisibleInsetPaths(
        state.paths,
        state.pathGroups,
        { next: (_, __) => 0 },
        clip,
    ).forEach((path) => {
        addCoordToBounds(bounds, path.origin);
        // TODO: Get proper bounding box for arc segments.
        path.segments.forEach((t) => addCoordToBounds(bounds, t.to));
    });
    if (bounds.x0 == null || bounds.y0 == null) {
        return null;
    }
    return { x1: bounds.x0!, y1: bounds.y0!, x2: bounds.x1!, y2: bounds.y1! };
};

export type Multi = NonNullable<State['view']['multi']>;

export const Export = ({
    state,
    dispatch,
    originalSize,
}: {
    state: State;
    originalSize: number;
    dispatch: (action: Action) => void;
}) => {
    // const [name, setName] = React.useState()
    const [animationPosition, setAnimationPosition] = React.useState(0);

    const [embed, setEmbed] = React.useState(true);
    const [history, setHistory] = React.useState(false);
    const name = `image-${Date.now()}${history ? '-history' : ''}.svg`;

    return (
        <div className="p-2" css={{}}>
            <div
                css={{
                    padding: 4,
                    marginBottom: 16,
                }}
            >
                Title:{' '}
                <Text
                    value={state.meta.title}
                    onChange={(title) =>
                        dispatch({
                            type: 'meta:update',
                            meta: { ...state.meta, title },
                        })
                    }
                />
                <br />
                <div>Description:</div>
                <Text
                    value={state.meta.description}
                    multiline
                    onChange={(description) =>
                        dispatch({
                            type: 'meta:update',
                            meta: { ...state.meta, description },
                        })
                    }
                />
            </div>
            <div>
                <Toggle
                    label="Embed editor state"
                    value={embed}
                    onChange={setEmbed}
                />
                {embed ? (
                    <Toggle
                        label="Embed history"
                        value={history}
                        onChange={setHistory}
                    />
                ) : null}
            </div>
            <div>
                Animation Position
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={animationPosition}
                    onChange={(evt) => setAnimationPosition(+evt.target.value)}
                />
                <BlurInt
                    value={animationPosition}
                    onChange={(v) => (v ? setAnimationPosition(v) : null)}
                />
            </div>
            <ExportPng
                state={state}
                originalSize={originalSize}
                embed={embed}
                history={history}
                animationPosition={animationPosition}
                name={name}
            />
            <ExportSVG
                state={state}
                dispatch={dispatch}
                originalSize={originalSize}
                embed={embed}
                history={history}
                name={name}
            />
            <div
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <div></div>
                {/* {render ? <RenderWebGL state={state} /> : null} */}
            </div>
        </div>
    );
};

const blankUIState: UIState = {
    hover: null,
    pendingDuplication: null,
    pendingMirror: null,
    previewActions: [],
    screen: 'edit',
    styleHover: null,
};

export const blankCanvasProps = {
    pendingMirror: null,
    setPendingMirror: (_: any) => {},
    dispatch: (_: any) => {},
    hover: null,
    setHover: (_: any) => {},
    uiState: blankUIState,
    styleHover: null,
    // Clear out background in laser cut mode
    pendingDuplication: null,
    setPendingDuplication: () => null,
    isTouchScreen: false,
} as const;

export const DL = ({
    url,
    name,
    subtitle,
}: {
    url: string;
    name: string;
    subtitle: string;
}) => {
    return (
        <>
            <a
                href={url}
                download={name}
                css={{
                    color: 'white',
                    background: '#666',
                    borderRadius: 6,
                    padding: '4px 8px',
                    display: 'block',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    marginBottom: 16,
                }}
            >
                Download {name}
            </a>
            {subtitle}
            <div
                style={{
                    backgroundImage: `url("${transparent}")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: 40,
                }}
            >
                <img src={url} css={{ maxHeight: 400 }} />
            </div>
        </>
    );
};
