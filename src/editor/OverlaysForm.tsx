
import {State} from '../types';
import {Action} from '../state/Action';
import {useDropTarget} from './useDropTarget';
import {Float, Toggle} from './Forms';
import {Button} from 'primereact/button';
import {DeleteForeverIcon} from '../icons/Icon';

export const OverlaysForm = ({state, dispatch}: {state: State; dispatch: (a: Action) => void}) => {
    const [dragging, callbacks] = useDropTarget((file) => {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = function () {
            var base64data = reader.result as string;
            const id = Math.random().toString(36).slice(2);
            const image = new Image();
            image.src = base64data;
            image.onload = () => {
                dispatch({
                    type: 'attachment:add',
                    attachment: {
                        id,
                        contents: base64data,
                        height: image.naturalHeight,
                        width: image.naturalWidth,
                        name: file.name,
                    },
                    id,
                });
            };
            image.onerror = () => {
                alert('Invalid image, sorry');
            };
        };
    });
    return (
        <div
            {...callbacks}
            style={{
                flex: 1,
                padding: 8,
                background: dragging ? 'rgba(255,255,255,0.1)' : '',
                transition: '.3s ease background',
            }}
        >
            <div css={{}}>
                {Object.keys(state.overlays).map((id) => (
                    <div
                        key={id}
                        css={{
                            margin: 8,
                            padding: 8,
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            borderBottom: '1px solid var(--surface-border)',
                        }}
                        style={
                            state.selection?.type === 'Overlay' && state.selection.ids.includes(id)
                                ? {
                                      border: '1px solid white',
                                  }
                                : {}
                        }
                        onClick={() => {
                            dispatch({
                                type: 'selection:set',
                                selection: {type: 'Overlay', ids: [id]},
                            });
                        }}
                    >
                        <img
                            src={state.attachments[state.overlays[id].source].contents}
                            style={{maxWidth: 200, maxHeight: 200}}
                        />
                        <div className="p-2">
                            <Toggle
                                value={!!state.overlays[id].hide}
                                onChange={(hide) =>
                                    dispatch({
                                        type: 'overlay:update',
                                        overlay: {
                                            ...state.overlays[id],
                                            hide,
                                        },
                                    })
                                }
                                label="Hide?"
                            />
                            <Toggle
                                value={!!state.overlays[id].over}
                                onChange={(over) =>
                                    dispatch({
                                        type: 'overlay:update',
                                        overlay: {
                                            ...state.overlays[id],
                                            over,
                                        },
                                    })
                                }
                                label="Over?"
                            />
                            <div className="p-1">
                                Opacity:{' '}
                                <Float
                                    value={state.overlays[id].opacity}
                                    onChange={(opacity) =>
                                        dispatch({
                                            type: 'overlay:update',
                                            overlay: {
                                                ...state.overlays[id],
                                                opacity,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    dispatch({
                                        type: 'overlay:delete',
                                        id,
                                    });
                                }}
                                className="p-button-danger p-button-lg mt-1 m-1"
                            >
                                <DeleteForeverIcon />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <div css={{margin: 8}}>
                Attachments: Drag &amp; drop an image on here to attach an image for use as an
                overlay.
            </div>
            <div
                css={{
                    margin: '16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                {Object.keys(state.attachments).map((id) => (
                    <div key={id} css={{display: 'flex', flexDirection: 'column'}}>
                        <img
                            src={state.attachments[id].contents}
                            style={{maxWidth: 200, maxHeight: 200}}
                        />
                        <button
                            onClick={() => {
                                dispatch({
                                    type: 'overlay:add',
                                    attachment: id,
                                });
                            }}
                        >
                            Add Overlay
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
