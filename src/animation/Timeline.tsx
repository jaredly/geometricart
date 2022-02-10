/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Action } from '../state/Action';
import { BlurInt, Toggle } from '../editor/Forms';
import { AddIcon, IconButton } from '../icons/Icon';
import { State, TimelineSlot } from '../types';
import eq from 'fast-deep-equal';
import { SlotEditor } from './SlotEditor';

export const Item = ({
    item,
    onChange,
    state,
}: {
    onChange: (item: TimelineSlot) => void;
    item: TimelineSlot;
    state: State;
}) => {
    const [editing, setEditing] = React.useState(null as null | TimelineSlot);
    if (editing) {
        const unChanged = eq(editing, item);
        return (
            <>
                <div css={{ display: 'flex', alignItems: 'center' }}>
                    <select
                        value={item.contents.type}
                        onChange={(evt) => {
                            const v = evt.target.value;
                            if (v === 'spacer') {
                                setEditing({
                                    ...item,
                                    contents: { type: 'spacer' },
                                });
                            } else {
                                setEditing({
                                    ...item,
                                    contents: {
                                        type: 'script',
                                        custom: {},
                                        phase: 'pre-inset',
                                        scriptId:
                                            Object.keys(
                                                state.animations.scripts,
                                            )[0] ?? 'script-0',
                                    },
                                });
                            }
                        }}
                    >
                        <option value={'spacer'}>Spacer</option>
                        <option value={'script'}>Script</option>
                    </select>{' '}
                    <Toggle
                        label="Enabled"
                        value={item.enabled}
                        onChange={(enabled) => setEditing({ ...item, enabled })}
                    />
                </div>

                <SlotEditor
                    item={editing}
                    onChange={setEditing}
                    state={state}
                />
                <div>
                    Weight:{' '}
                    <BlurInt
                        value={item.weight}
                        onChange={(weight) =>
                            weight ? setEditing({ ...item, weight }) : null
                        }
                    />
                </div>

                <button
                    disabled={unChanged}
                    onClick={() => {
                        onChange(editing);
                        setEditing(null);
                    }}
                >
                    Save
                </button>
                <button onClick={() => setEditing(null)}>Cancel</button>
            </>
        );
    }
    if (item.contents.type === 'spacer') {
        return (
            <>
                Spacer: {item.weight}
                <button onClick={() => setEditing(item)}>Edit</button>
            </>
        );
    }
    return (
        <>
            Script {item.weight} {item.contents.scriptId}
            <button onClick={() => setEditing(item)}>Edit</button>
        </>
    );
};

export function Timelines({
    state,
    dispatch,
    // animations,
    // onChange,
    animationPosition,
}: // setAnimationPosition,
{
    state: State;
    dispatch: (action: Action) => unknown;
    // animations: Animations;
    // onChange: (animations: Animations) => void;
    animationPosition: number;
    setAnimationPosition: (p: number) => void;
}) {
    const [error, setError] = React.useState(null as null | Error);

    // const [editing, setEditing] = React.useState(null as null | Animations)

    return (
        <div style={{ flex: 1 }}>
            {state.animations.timelines.map((timeline, ti) => (
                <div
                    key={ti}
                    css={{
                        padding: 4,
                    }}
                    style={timeline.enabled ? {} : { opacity: 0.7 }}
                >
                    <div css={{ display: 'flex', flexDirection: 'row' }}>
                        <div css={{ fontWeight: 'bold', padding: 4 }}>
                            Timeline {ti}
                        </div>
                        <Toggle
                            label="enabled"
                            value={timeline.enabled}
                            onChange={(enabled) => {
                                dispatch({
                                    type: 'timeline:lane:are',
                                    action: {
                                        type: 'edit',
                                        key: ti,
                                        value: { enabled },
                                    },
                                });
                            }}
                        />
                    </div>
                    <div
                        css={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'stretch',
                            position: 'relative',
                            margin: 4,
                        }}
                    >
                        {timeline.items.map((item, i) => (
                            <div
                                style={{ flex: item.weight }}
                                css={{
                                    border: '1px solid white',
                                    padding: 8,
                                    minHeight: 100,
                                    position: 'relative',
                                }}
                            >
                                <Item
                                    state={state}
                                    onChange={(item) => {
                                        dispatch({
                                            type: 'timeline:slot:are',
                                            timeline: ti,
                                            action: {
                                                type: 'edit',
                                                key: i,
                                                value: item,
                                            },
                                        });
                                    }}
                                    item={item}
                                    key={i}
                                />
                                <IconButton
                                    size={12}
                                    css={{
                                        position: 'absolute',
                                        left: '100%',
                                        zIndex: 100,
                                        top: 0,
                                        marginLeft: -14,
                                        backgroundColor: 'black',
                                        opacity: 0.1,
                                        ':hover': {
                                            opacity: 1,
                                        },
                                    }}
                                    onClick={() => {
                                        dispatch({
                                            type: 'timeline:slot:are',
                                            timeline: ti,
                                            action: {
                                                type: 'add',
                                                key: i + 1,
                                            },
                                        });
                                    }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </div>
                        ))}
                        <div
                            style={{
                                width: 1,
                                height: 100,
                                backgroundColor: 'red',
                                position: 'absolute',
                                top: 0,
                                left: `${animationPosition * 100}%`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
