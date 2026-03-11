import React from 'react';
import {Action} from '../state/Action';
import {BlurInt, Toggle} from '../editor/Forms';
import {AddIcon, IconButton} from '../icons/Icon';
import {State, TimelineSlot} from '../types';
import eq from 'fast-deep-equal';
import {SlotEditor} from './SlotEditor';
import {EyeIcon, EyeInvisibleIcon} from '../icons/Eyes';

const Item = ({
    item,
    onChange,
    onDelete,
    state,
}: {
    onChange: (item: TimelineSlot | null) => void;
    onDelete: () => void;
    item: TimelineSlot;
    state: State;
}) => {
    const [editing, setEditing] = React.useState(item);
    // if (editing) {
    const unChanged = eq(editing, item);
    return (
        <div
            css={{
                border: '1px solid magenta',
                margin: 4,
                padding: 8,
            }}
        >
            <div css={{display: 'flex', alignItems: 'center'}}>
                <select
                    value={item.contents.type}
                    onChange={(evt) => {
                        const v = evt.target.value;
                        if (v === 'spacer') {
                            setEditing({
                                ...item,
                                contents: {type: 'spacer'},
                            });
                        } else {
                            setEditing({
                                ...item,
                                contents: {
                                    type: 'script',
                                    custom: {},
                                    phase: 'pre-inset',
                                    scriptId:
                                        Object.keys(state.animations.scripts)[0] ?? 'script-0',
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
                    onChange={(enabled) => setEditing({...item, enabled})}
                />
            </div>

            <SlotEditor item={editing} onChange={setEditing} state={state} />
            <div>
                Weight:{' '}
                <BlurInt
                    value={item.weight}
                    onChange={(weight) => (weight ? setEditing({...item, weight}) : null)}
                />
            </div>

            <button
                disabled={unChanged}
                onClick={() => {
                    onChange(editing);
                    // setEditing(null);
                }}
            >
                Save
            </button>
            <button onClick={() => onChange(null)}>Cancel</button>
            <button onClick={() => onDelete()}>Delete</button>
        </div>
    );
    // }
    // if (item.contents.type === 'spacer') {
    //     return (
    //         <>
    //             Spacer: {item.weight}
    //             <button onClick={() => setEditing(item)}>Edit</button>
    //         </>
    //     );
    // }
    // return (
    //     <>
    //         Script {item.weight} {item.contents.scriptId}
    //         <button onClick={() => setEditing(item)}>Edit</button>
    //     </>
    // );
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

    const [editing, setEditing] = React.useState(null as null | [number, number]);

    return (
        <div style={{flex: 1}}>
            <button
                onClick={() => {
                    dispatch({
                        type: 'timeline:lane:are',
                        action: {
                            type: 'add',
                            key: state.animations.timelines.length,
                        },
                    });
                }}
            >
                Add timeline
            </button>
            {state.animations.timelines.map((timeline, ti) => {
                const min = timeline.items.reduce((x, i) => Math.min(x, i.weight), Infinity);
                const factor = 1 / min;
                return (
                    <div
                        key={ti}
                        css={{
                            padding: 4,
                            display: 'flex',
                            flexDirection: 'row',
                        }}
                        style={timeline.enabled ? {} : {opacity: 0.7}}
                    >
                        <div
                            css={{
                                cursor: 'pointer',
                                marginRight: 16,
                                padding: 8,
                                ':hover': {
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                },
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            onClick={() => {
                                dispatch({
                                    type: 'timeline:lane:are',
                                    action: {
                                        type: 'edit',
                                        key: ti,
                                        value: {enabled: !timeline.enabled},
                                    },
                                });
                            }}
                        >
                            {timeline.enabled ? <EyeIcon /> : <EyeInvisibleIcon />}
                        </div>
                        {/* <div css={{ display: 'flex', flexDirection: 'row' }}>
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
                        </div> */}
                        <div
                            css={{
                                display: 'flex',
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'stretch',
                                position: 'relative',
                                margin: 4,
                            }}
                        >
                            <IconButton
                                size={12}
                                css={{
                                    position: 'absolute',
                                    left: 0,
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
                                            key: 0,
                                        },
                                    });
                                }}
                            >
                                <AddIcon />
                            </IconButton>

                            {timeline.items.map((item, i) => (
                                <div
                                    key={i}
                                    style={{flex: item.weight * factor}}
                                    css={{
                                        border: '1px solid white',
                                        height: 30,
                                        position: 'relative',
                                        textAlign: 'center',
                                        padding: 4,
                                        cursor: 'pointer',
                                        ':hover': {
                                            background: '#aef',
                                        },
                                    }}
                                    onClick={() => setEditing([ti, i])}
                                >
                                    {item.contents.type === 'script' ? item.contents.scriptId : ''}
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
                                    height: 30,
                                    backgroundColor: 'red',
                                    position: 'absolute',
                                    top: 0,
                                    left: `${animationPosition * 100}%`,
                                    pointerEvents: 'none',
                                }}
                            />
                        </div>
                    </div>
                );
            })}

            {editing ? (
                <Item
                    key={editing[0] + ':' + editing[1]}
                    state={state}
                    onDelete={() => {
                        const [ti, i] = editing!;
                        dispatch({
                            type: 'timeline:slot:are',
                            timeline: ti,
                            action: {type: 'remove', key: i},
                        });
                        setEditing(null);
                    }}
                    onChange={(item) => {
                        if (!item) {
                            return setEditing(null);
                        }
                        const [ti, i] = editing!;
                        dispatch({
                            type: 'timeline:slot:are',
                            timeline: ti,
                            action: {
                                type: 'edit',
                                key: i,
                                value: item,
                            },
                        });
                        setEditing(null);
                    }}
                    item={state.animations.timelines[editing[0]].items[editing[1]]}
                />
            ) : null}
        </div>
    );
}
