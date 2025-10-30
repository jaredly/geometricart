/* @jsx jsx */
/* @jsxFrag React.Fragment */
import {jsx} from '@emotion/react';
import {diff} from 'json-diff-ts';
import React from 'react';
import {PendingMirror} from '../useUIState';
import {Action, UndoAction} from '../state/Action';
import {initialState} from '../state/initialState';
import {Id, Selection, State} from '../types';
import {getStateFromFile} from './useDropTarget';

export const PREFIX = `<!-- STATE:`;
export const SUFFIX = '-->';

export type Hover =
    | {
          type: 'element';
          kind: Selection['type'] | 'Clip' | 'Tiling';
          id: Id;
      }
    | {type: 'guides'; ids?: string[]};

type TabProps = {
    state: State;
    dispatch: (action: Action) => unknown;
    canvasRef: {current: SVGSVGElement | null};
    hover: Hover | null;
    width: number;
    height: number;
    setHover: (hover: Hover | null) => void;
    setPendingMirror: (mirror: PendingMirror | null) => void;
};

const showDiff = (diff: any[]) => {
    return diff.map((item) =>
        item.type === 'UPDATE'
            ? `Update ${item.key}`
            : item.type === 'REMOVE'
              ? `Remove ${item.key}`
              : '',
    );
};

export const UndoItem = ({item}: {item: UndoAction}) => {
    switch (item.type) {
        case 'view:update':
            return <span>View: {showDiff(diff(item.action.view, item.prev))}</span>;
        case 'overlay:update':
            return <span>Overlay: {showDiff(diff(item.action.overlay, item.prev))}</span>;
        case 'path:update:many':
            return <span>Update {Object.keys(item.action.changed).length} paths</span>;
    }
    return <span>{item.type}</span>;
};

const ReallyButton = ({
    label,
    onClick,
    className,
}: {
    label: string;
    onClick: () => void;
    className?: string;
}) => {
    const [really, setReally] = React.useState(false);
    if (really) {
        return (
            <>
                <button className={className} onClick={() => setReally(false)}>
                    Nope
                </button>
                <button
                    className={className}
                    onClick={() => {
                        onClick();
                        setReally(false);
                    }}
                >
                    Really {label}
                </button>
            </>
        );
    }
    return (
        <button className={className} onClick={() => setReally(true)}>
            {label}
        </button>
    );
};

function Sidebar({dispatch}: {dispatch: (action: Action) => void}) {
    return (
        <div
            style={{
                overflow: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                transition: '.3s ease background',
            }}
        >
            <div>
                <div
                    css={{
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <ReallyButton
                        label="Clear all"
                        css={{margin: 8}}
                        onClick={() => {
                            dispatch({type: 'reset', state: initialState});
                        }}
                    />
                    Import project:{' '}
                    <input
                        type="file"
                        placeholder="Select a file to import"
                        onChange={(evt) => {
                            if (evt.target.files?.length !== 1) {
                                return;
                            }
                            getStateFromFile(
                                evt.target.files[0],
                                (state) => {
                                    if (state) {
                                        dispatch({type: 'reset', state});
                                    } else {
                                        alert(
                                            "Unable to parse state from image. Maybe this wasn't saved with project metadata?",
                                        );
                                    }
                                },
                                null,
                                (err) => {
                                    console.log(err);
                                    alert(err);
                                },
                            );
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
