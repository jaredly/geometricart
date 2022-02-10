/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { Action } from '../state/Action';
import { BlurInt, Toggle } from '../editor/Forms';
import { AddIcon, IconButton } from '../icons/Icon';
import { State, TimelineSlot } from '../types';
import eq from 'fast-deep-equal';

export const ItemEditor = ({
    item,
    onChange,
    state,
}: {
    item: TimelineSlot;
    onChange: (item: TimelineSlot) => void;
    state: State;
}) => {
    if (item.contents.type === 'spacer') {
        return <div />;
    }
    const contents = item.contents;
    return (
        <>
            {
                <>
                    <select
                        value={item.contents.scriptId}
                        onChange={(evt) => {
                            onChange({
                                ...item,
                                contents: {
                                    ...contents,
                                    scriptId: evt.target.value,
                                },
                            });
                        }}
                    >
                        {Object.keys(state.animations.scripts).map((key) => (
                            <option key={key} value={key}>
                                {key}
                            </option>
                        ))}
                        {!state.animations.scripts[item.contents.scriptId] ? (
                            <option disabled value={item.contents.scriptId}>
                                {item.contents.scriptId} (missing?)
                            </option>
                        ) : null}
                    </select>
                    {contents.selection ? (
                        <div>
                            Current selection: {contents.selection.ids.length}{' '}
                            {contents.selection.type}
                            <button
                                onClick={() => {
                                    onChange({
                                        ...item,
                                        contents: {
                                            ...contents,
                                            selection: undefined,
                                        },
                                    });
                                }}
                            >
                                Clear selection
                            </button>
                        </div>
                    ) : (
                        <div>
                            No selection (will apply to all paths)
                            <button
                                disabled={!state.selection}
                                onClick={() => {
                                    const sel = state.selection;
                                    if (
                                        sel?.type === 'PathGroup' ||
                                        sel?.type === 'Path'
                                    ) {
                                        onChange({
                                            ...item,
                                            contents: {
                                                ...contents,
                                                selection: sel as any,
                                            },
                                        });
                                    }
                                }}
                            >
                                Set current selection
                            </button>
                        </div>
                    )}
                </>
            }
        </>
    );
};

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
                    {item.contents.type[0].toUpperCase() +
                        item.contents.type.slice(1)}
                    :{' '}
                    <Toggle
                        label="Enabled"
                        value={item.enabled}
                        onChange={(enabled) => setEditing({ ...item, enabled })}
                    />
                </div>

                <ItemEditor
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
                                        // ok
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

    // return (
    //     <div style={{ flex: 1, marginBottom: 100 }}>
    //         <div style={{ display: 'flex', padding: 8 }}>
    //             <button
    //                 style={{ marginRight: 16 }}
    //                 onClick={() => {
    //                     let i = 0;
    //                     while (animations.scripts[`script-${i}`]) {
    //                         i++;
    //                     }
    //                     const newKey = `script-${i}`;
    //                     dispatch({
    //                         type: 'script:update',
    //                         key: newKey,
    //                         script: {
    //                             code: `(paths, t) => {\n    // do stuff\n}`,
    //                             enabled: true,
    //                             phase: 'pre-inset',
    //                         },
    //                     });
    //                 }}
    //             >
    //                 Add script
    //             </button>
    //         </div>
    //         {Object.keys(animations.scripts).map((key) => {
    //             const script = animations.scripts[key];
    //             if (!script.enabled) {
    //                 return (
    //                     <div
    //                         key={key}
    //                         style={{
    //                             padding: 8,
    //                             border: '1px solid #aaa',
    //                             margin: 8,
    //                         }}
    //                     >
    //                         {key}{' '}
    //                         <button
    //                             onClick={() => {
    //                                 dispatch({
    //                                     type: 'script:update',
    //                                     key,
    //                                     script: {
    //                                         ...script,
    //                                         enabled: true,
    //                                     },
    //                                 });
    //                             }}
    //                         >
    //                             Enable
    //                         </button>
    //                     </div>
    //                 );
    //             }
    //             return (
    //                 <div
    //                     key={key}
    //                     style={{
    //                         padding: 8,
    //                         border: '1px solid white',
    //                         margin: 8,
    //                     }}
    //                 >
    //                     <div>{key}</div>
    //                     <button
    //                         onClick={() => {
    //                             dispatch({
    //                                 type: 'script:update',
    //                                 key,
    //                                 script: {
    //                                     ...script,
    //                                     enabled: !script.enabled,
    //                                 },
    //                             });
    //                         }}
    //                     >
    //                         {script.enabled ? 'Disable' : 'Enable'}
    //                     </button>
    //                     {script.selection ? (
    //                         <div>
    //                             Current selection: {script.selection.ids.length}{' '}
    //                             {script.selection.type}
    //                             <button
    //                                 onClick={() => {
    //                                     dispatch({
    //                                         type: 'script:update',
    //                                         key,
    //                                         script: {
    //                                             ...script,
    //                                             selection: undefined,
    //                                         },
    //                                     });
    //                                 }}
    //                             >
    //                                 Clear selection
    //                             </button>
    //                         </div>
    //                     ) : (
    //                         <div>
    //                             No selection (will apply to all paths)
    //                             <button
    //                                 disabled={!state.selection}
    //                                 onClick={() => {
    //                                     const sel = state.selection;
    //                                     if (
    //                                         sel?.type === 'PathGroup' ||
    //                                         sel?.type === 'Path'
    //                                     ) {
    //                                         dispatch({
    //                                             type: 'script:update',
    //                                             key,
    //                                             script: {
    //                                                 ...script,
    //                                                 selection: sel as any,
    //                                             },
    //                                         });
    //                                     }
    //                                 }}
    //                             >
    //                                 Set current selection
    //                             </button>
    //                         </div>
    //                     )}
    //                     <div
    //                         style={{
    //                             display: 'flex',
    //                             flexDirection: 'column',
    //                             alignItems: 'stretch',
    //                         }}
    //                     >
    //                         <Text
    //                             key={key}
    //                             multiline
    //                             value={script.code}
    //                             style={{ minHeight: 100 }}
    //                             onChange={(code) => {
    //                                 try {
    //                                     const formatted = prettier.format(
    //                                         code,
    //                                         {
    //                                             plugins: [babel],
    //                                             parser: 'babel',
    //                                         },
    //                                     );
    //                                     dispatch({
    //                                         type: 'script:update',
    //                                         key,
    //                                         script: {
    //                                             ...script,
    //                                             code: formatted,
    //                                         },
    //                                     });
    //                                     setError(null);
    //                                 } catch (err) {
    //                                     setError(err as Error);
    //                                 }
    //                             }}
    //                         />
    //                         {error ? (
    //                             <div
    //                                 style={{
    //                                     background: '#faa',
    //                                     border: '2px solid #f00',
    //                                     padding: 16,
    //                                     margin: 8,
    //                                     width: 400,
    //                                     whiteSpace: 'pre-wrap',
    //                                     fontFamily: 'monospace',
    //                                 }}
    //                             >
    //                                 {error.message}
    //                             </div>
    //                         ) : null}
    //                     </div>
    //                 </div>
    //             );
    //         })}
    //     </div>
    // );
    return <div>ok</div>;
}
