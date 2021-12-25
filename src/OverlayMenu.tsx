/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import React from 'react';
import { EyeIcon, EyeInvisibleIcon } from './icons/Eyes';
import {
    BringToFrontIcon,
    DeleteForeverIcon,
    IconButton,
    ImagesIcon,
    SendToBackIcon,
} from './icons/Icon';
import { Hover } from './Sidebar';
import { Action, State } from './types';

export const OverlayMenu = ({
    state,
    dispatch,
    setHover,
}: {
    state: State;
    dispatch: (a: Action) => void;
    setHover: (h: Hover | null) => void;
}) => {
    const [open, setOpen] = React.useState(false);
    return (
        <div
            css={{
                position: 'absolute',
                top: 0,
                left: 58,
            }}
        >
            <IconButton
                onClick={() => {
                    setOpen((o) => !o);
                }}
                css={
                    {
                        // width: 58,
                        // height: 58,
                        // display: 'flex',
                        // alignItems: 'center',
                        // justifyContent: 'center',
                    }
                }
                selected={open}
            >
                <ImagesIcon />
                {/* {state.selection?.type === 'Overlay'
                        ? 'Deselect overlay'
                        : 'Select overlay'} */}
            </IconButton>
            {open ? (
                <div>
                    {Object.keys(state.overlays).map((k) => (
                        <div
                            css={{
                                cursor: 'pointer',
                                position: 'relative',
                            }}
                            // TODO: On hover, show it, please
                            onClick={() => {
                                if (
                                    state.selection?.type === 'Overlay' &&
                                    state.selection.ids?.includes(k)
                                ) {
                                    dispatch({
                                        type: 'selection:set',
                                        selection: null,
                                    });
                                } else {
                                    dispatch({
                                        type: 'selection:set',
                                        selection: {
                                            type: 'Overlay',
                                            ids: [k],
                                        },
                                    });
                                }
                            }}
                        >
                            <img
                                src={
                                    state.attachments[state.overlays[k].source]
                                        .contents
                                }
                                css={{
                                    objectFit: 'cover',
                                    width: 58,
                                    height: 58,
                                    border:
                                        state.selection?.type === 'Overlay' &&
                                        state.selection?.ids.includes(k)
                                            ? '4px solid white'
                                            : 'none',
                                }}
                            />
                            <div
                                css={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    position: 'absolute',
                                    top: 0,
                                    left: 58,
                                }}
                            >
                                <IconButton
                                    onClick={() => {
                                        dispatch({
                                            type: 'overlay:update',
                                            overlay: {
                                                ...state.overlays[k],
                                                hide: !state.overlays[k].hide,
                                            },
                                        });
                                        setOpen(false);
                                        setHover(null);
                                    }}
                                    onMouseOver={() =>
                                        setHover({ kind: 'Overlay', id: k })
                                    }
                                    onMouseOut={() => setHover(null)}
                                    hoverIcon={
                                        !state.overlays[k].hide ? (
                                            <EyeInvisibleIcon />
                                        ) : (
                                            <EyeIcon />
                                        )
                                    }
                                >
                                    {state.overlays[k].hide ? (
                                        <EyeInvisibleIcon />
                                    ) : (
                                        <EyeIcon />
                                    )}
                                </IconButton>
                                {!state.overlays[k].hide ? (
                                    <IconButton
                                        onClick={() => {
                                            dispatch({
                                                type: 'overlay:update',
                                                overlay: {
                                                    ...state.overlays[k],
                                                    over: !state.overlays[k]
                                                        .over,
                                                },
                                            });
                                            setOpen(false);
                                            setHover(null);
                                        }}
                                        hoverIcon={
                                            !state.overlays[k].over ? (
                                                <BringToFrontIcon />
                                            ) : (
                                                <SendToBackIcon />
                                            )
                                        }
                                    >
                                        {state.overlays[k].over ? (
                                            <BringToFrontIcon />
                                        ) : (
                                            <SendToBackIcon />
                                        )}
                                    </IconButton>
                                ) : null}
                                <IconButton
                                    onClick={() => {
                                        dispatch({
                                            type: 'overlay:delete',
                                            id: k,
                                        });
                                        setOpen(false);
                                        setHover(null);
                                    }}
                                >
                                    <DeleteForeverIcon />
                                </IconButton>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};
