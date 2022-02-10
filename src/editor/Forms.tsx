/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import * as React from 'react';
import { transparent } from './Icons';
import { Circle, Guide, Line, Path, PathGroup, Style, View } from '../types';

export const Text = ({
    value,
    onChange,
    multiline,
    style,
}: {
    value: string;
    onChange: (v: string) => void;
    style?: React.StyleHTMLAttributes<'div'>['style'];
    multiline?: boolean;
}) => {
    const [text, setText] = React.useState(null as null | string);
    const lastValue = React.useRef(value);
    React.useEffect(() => {
        if (lastValue.current !== value) {
            setText(value);
            lastValue.current = value;
        }
    }, [value]);
    const shared = {
        value: text ?? value,
        style,
        onChange: (
            evt: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => setText(evt.target.value),
        onBlur: () => {
            if (text != null) {
                onChange(text);
                // setText(null);
            }
        },
    };
    return multiline ? (
        <textarea {...shared} />
    ) : (
        <input type="text" {...shared} />
    );
};

export const BlurInt = ({
    value,
    onChange,
    label,
    width,
}: {
    value: number | undefined | null;
    width?: number;
    onChange: (v: number | undefined) => unknown;
    label?: (ppi: number) => React.ReactNode;
}) => {
    const [text, setText] = React.useState(null as null | string);
    let v = value;
    if (text != null) {
        const res = +text;
        if (!isNaN(res) && text.trim()) {
            v = res;
        }
    }
    return (
        <>
            <input
                value={text != null ? text : value ?? ''}
                onChange={(evt) => {
                    setText(evt.target.value);
                }}
                onKeyDown={(evt) => {
                    if (evt.key === 'Return' || evt.key === 'Enter') {
                        (evt.target as HTMLInputElement).blur();
                    }
                }}
                onBlur={() => {
                    if (text != null) {
                        const res = +text;
                        if (isNaN(res) || !text.trim()) {
                            onChange(undefined);
                        } else {
                            onChange(res);
                        }
                    }
                }}
                css={{
                    width: width ?? 50,
                }}
                step="1"
                type="number"
            />
            {label && v != null ? label(v) : null}
        </>
    );
};

export const Float = ({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => unknown;
}) => {
    return (
        <input
            value={value}
            onChange={(evt) => onChange(+evt.target.value)}
            step="0.1"
            css={{
                width: 50,
            }}
            type="number"
        />
    );
};

export const Int = ({
    value,
    onChange,
}: {
    value: number | undefined;
    onChange: (v: number | undefined) => unknown;
}) => {
    return (
        <input
            value={value}
            onChange={(evt) => {
                const res = +evt.target.value;
                if (isNaN(res) || !evt.target.value.trim()) {
                    onChange(undefined);
                } else {
                    onChange(res);
                }
            }}
            css={{
                width: 50,
            }}
            step="1"
            type="number"
        />
    );
};

export const Label = ({ text }: { text: string }) => (
    <div
        css={{
            fontWeight: 'bold',
        }}
    >
        {text}
    </div>
);

export const Color = ({
    color,
    onChange,
    palette,
    extra = ['black', 'white', 'transparent'],
}: {
    color: string | undefined | number;
    onChange: (color: string | undefined | number) => void;
    palette: Array<string>;
    extra?: Array<string>;
}) => {
    return (
        <div>
            {palette.map((item, i) => (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    style={{
                        border: `2px solid ${color === i ? 'white' : '#444'}`,
                        background: item.startsWith('http')
                            ? `url("${item}")`
                            : item,
                    }}
                    css={{
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                    }}
                />
            ))}
            {extra.map((name, i) => (
                <button
                    key={name}
                    onClick={() => onChange(name)}
                    style={{
                        background:
                            name === 'transparent'
                                ? `url("${transparent}")`
                                : name,
                    }}
                    css={{
                        border: `2px solid ${
                            color === name ? 'white' : '#444'
                        }`,
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                    }}
                ></button>
            ))}
        </div>
    );
};

export const Toggle = ({
    label,
    onChange,
    value,
}: {
    value: boolean;
    onChange: (v: boolean) => unknown;
    label: string;
}) => {
    return (
        <div
            css={{
                cursor: 'pointer',
                padding: 4,
                ':hover': {
                    background: 'rgba(100,100,100,0.1)',
                },
            }}
            onClick={(evt) => {
                evt.stopPropagation();
                onChange(!value);
            }}
        >
            {label}
            <input
                style={{
                    marginLeft: 4,
                }}
                onClick={(evt) => evt.stopPropagation()}
                onChange={() => {
                    onChange(!value);
                }}
                type="checkbox"
                checked={value}
            />
        </div>
    );
};

export const StyleForm = ({
    style,
    palette,
    onChange,
}: {
    style: Style;
    onChange: (s: Style) => unknown;
    palette: Array<string>;
}) => {
    return (
        <div>
            Fills:
            {style.fills.map((fill, i) =>
                fill ? (
                    <div key={i}>
                        <Color
                            palette={palette}
                            color={fill.color}
                            onChange={(color) => {
                                const fills = style.fills.slice();
                                fills[i] = { ...fill, color };
                                onChange({
                                    ...style,
                                    fills,
                                });
                            }}
                        />
                    </div>
                ) : (
                    <div key={i}>Fill disabled</div>
                ),
            )}
            Lines:
            {style.lines.map((line, i) =>
                line ? (
                    <div key={i}>
                        <Int
                            value={line.width || 1}
                            onChange={(width) => {
                                const lines = style.lines.slice();
                                lines[i] = { ...line, width };
                                onChange({
                                    ...style,
                                    lines,
                                });
                            }}
                        />
                        <Color
                            color={line.color}
                            palette={palette}
                            onChange={(color) => {
                                const lines = style.lines.slice();
                                lines[i] = { ...line, color };
                                onChange({
                                    ...style,
                                    lines,
                                });
                            }}
                        />
                    </div>
                ) : (
                    <div key={i}>Fill disabled</div>
                ),
            )}
        </div>
    );
};

export const PathGroupForm = ({
    group,
    palette,
    selected,
    onChange,
    onMouseOver,
    onMouseOut,
    onDelete,
}: {
    group: PathGroup;
    palette: Array<string>;
    selected: boolean;
    onChange: (group: PathGroup) => unknown;
    onMouseOver: () => void;
    onMouseOut: () => void;
    onDelete: () => void;
}) => {
    // const ref = React.useRef(null as null | HTMLDivElement);
    // React.useEffect(() => {
    //     if (selected) {
    //         ref.current?.scrollIntoView(false);
    //     }
    // }, [selected]);
    return (
        <div
            // ref={(node) => (ref.current = node)}
            css={{ padding: 4, borderBottom: '1px solid #aaa', margin: 4 }}
            style={{
                backgroundColor: selected ? 'rgba(255,255,255,0.1)' : undefined,
            }}
            onMouseOut={onMouseOut}
            onMouseOver={onMouseOver}
        >
            <div
                css={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                Path Group {group.id}
                <div style={{ flexBasis: 10 }} />
                <Toggle
                    value={!!group.hide}
                    onChange={(hide) => onChange({ ...group, hide })}
                    label="Hide"
                />
                Ordering:
                <Int
                    value={group.ordering}
                    onChange={(ordering) => onChange({ ...group, ordering })}
                />
                <div style={{ flex: 1 }} />
                <button
                    onClick={() => {
                        onDelete();
                    }}
                >
                    Delete
                </button>
            </div>
            <Toggle
                value={!!group.insetBeforeClip}
                onChange={(insetBeforeClip) =>
                    onChange({ ...group, insetBeforeClip })
                }
                label="Inset before clip"
            />
            <div>
                Clip Mode:
                {['none', 'remove', 'normal'].map((name) => (
                    <button
                        key={name}
                        onClick={() => {
                            if (group.clipMode === name) {
                                return onChange({
                                    ...group,
                                    clipMode: undefined,
                                });
                            }
                            return onChange({
                                ...group,
                                clipMode: name as PathGroup['clipMode'],
                            });
                        }}
                    >
                        {name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const hasNonBodyScrollParent = (node: HTMLElement) => {
    let parent = node.parentElement;
    while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        if (
            style.overflow.match(/auto|scroll/) ||
            style.overflowY.match(/auto|scroll/)
        ) {
            if (
                parent.scrollHeight >
                parent.getBoundingClientRect().height + 10
            ) {
                return true;
            }
        }
        parent = parent.parentElement;
    }
    return false;
};

export const PathForm = ({
    path,
    palette,
    onChange,
    onDelete,
    onMouseOver,
    onMouseOut,
    selected,
}: {
    onMouseOver: () => void;
    onMouseOut: () => void;
    path: Path;
    selected: boolean;
    palette: Array<string>;
    onChange: (path: Path) => unknown;
    onDelete: () => void;
}) => {
    const ref = React.useRef(null as null | HTMLDivElement);
    React.useEffect(() => {
        // console.log(ref.current, 'scroll apth');
        if (selected && ref.current && hasNonBodyScrollParent(ref.current)) {
            ref.current?.scrollIntoView({ block: 'nearest' });
        }
    }, [selected]);
    return (
        <div
            ref={(node) => (ref.current = node)}
            css={{ padding: 4, borderBottom: '1px solid #aaa', margin: 4 }}
            style={{
                backgroundColor: selected ? 'rgba(255,255,255,0.1)' : undefined,
            }}
            onMouseOut={onMouseOut}
            onMouseOver={onMouseOver}
        >
            <div
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                Path! {path.id}
                <div style={{ flexBasis: 8 }} />
                <Toggle
                    label="Hide"
                    value={path.hidden}
                    onChange={(hidden) => onChange({ ...path, hidden })}
                />
                <div style={{ flex: 1 }} />
                <button onClick={onDelete}>Delete</button>
            </div>
            <Toggle
                label="Debug"
                value={!!path.debug}
                onChange={(debug) => onChange({ ...path, debug })}
            />
            <div>
                Clip Mode:
                {['none', 'remove', 'normal'].map((name) => (
                    <button
                        key={name}
                        onClick={() => {
                            if (path.clipMode === name) {
                                return onChange({
                                    ...path,
                                    clipMode: undefined,
                                });
                            }
                            return onChange({
                                ...path,
                                clipMode: name as Path['clipMode'],
                            });
                        }}
                    >
                        {name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const GuideForm = ({
    guide,
    selected,
    onChange,
    onMouseOver,
    onMouseOut,
    onDelete,
}: {
    guide: Guide;
    selected: boolean;
    onChange: (guide: Guide) => unknown;
    onMouseOver: () => void;
    onMouseOut: () => void;
    onDelete: () => void;
}) => {
    const [expanded, setExpanded] = React.useState(false);
    // const ref = React.useRef(null as null | HTMLDivElement);
    // React.useEffect(() => {
    //     if (selected) {
    //         ref.current?.scrollIntoView(false);
    //     }
    // }, [selected]);
    return (
        <div
            // ref={(node) => (ref.current = node)}
            onMouseOut={onMouseOut}
            onMouseOver={onMouseOver}
            css={{
                padding: 4,
            }}
        >
            <div
                css={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    background: selected
                        ? 'rgba(100,100,100,0.4)'
                        : 'rgba(100,100,100,0.1)',
                    ':hover': {
                        background: 'rgba(100,100,100,0.2)',
                    },
                }}
                onClick={() => setExpanded(!expanded)}
                // onClick={() => onChange({ ...guide, active: !guide.active })}
            >
                {expanded ? '🔻' : '▶️'}
                {guide.geom.type} Guide
                <Toggle
                    label="Active"
                    value={guide.active}
                    onChange={(active) => onChange({ ...guide, active })}
                />
                <div style={{ flex: 1 }} />
                <button
                    onClick={() => {
                        onDelete();
                    }}
                >
                    Delete
                </button>
            </div>
            {expanded ? (
                <>
                    {guide.geom.type === 'Circle' ? (
                        <>
                            <Int
                                value={guide.geom.multiples}
                                onChange={(multiples) =>
                                    multiples != null && multiples >= 0
                                        ? onChange({
                                              ...guide,
                                              geom: {
                                                  ...(guide.geom as Circle),
                                                  multiples,
                                              },
                                          })
                                        : null
                                }
                            />
                            <Toggle
                                label="Half circle"
                                value={guide.geom.half}
                                onChange={(half) =>
                                    onChange({
                                        ...guide,
                                        geom: {
                                            ...(guide.geom as Circle),
                                            half,
                                        },
                                    })
                                }
                            />
                        </>
                    ) : null}
                    {guide.geom.type === 'Line' ? (
                        <>
                            <Toggle
                                value={guide.geom.limit}
                                onChange={(limit) => {
                                    onChange({
                                        ...guide,
                                        geom: {
                                            ...(guide.geom as Line),
                                            limit,
                                        },
                                    });
                                }}
                                label="Restrict to segment"
                            />
                            <div>
                                Extent:{' '}
                                <Int
                                    value={guide.geom.extent}
                                    onChange={(extent) => {
                                        onChange({
                                            ...guide,
                                            geom: {
                                                ...(guide.geom as Line),
                                                extent,
                                            },
                                        });
                                    }}
                                />
                            </div>
                        </>
                    ) : null}
                </>
            ) : null}
        </div>
    );
};

export const ViewForm = ({
    view,
    onChange,
    palette,
}: // onHoverClip,
{
    view: View;
    onChange: (view: View) => unknown;
    // onHoverClip: (hover: boolean) => void;
    palette: Array<string>;
}) => {
    const backgrounds = ['#1e1e1e', 'white', 'black', 'transparent'];
    return (
        <div
            css={{
                padding: 8,
                border: '1px solid #ccc',
                margin: '4px 0',
            }}
        >
            <div>View</div>

            <Toggle
                label="Show guides"
                value={view.guides}
                onChange={(guides) => onChange({ ...view, guides })}
            />

            <Toggle
                label="Laser Cut Mode"
                value={!!view.laserCutMode}
                onChange={(laserCutMode) => onChange({ ...view, laserCutMode })}
            />

            <Toggle
                label="Hide duplicate paths"
                value={!!view.hideDuplicatePaths}
                onChange={(hideDuplicatePaths) =>
                    onChange({ ...view, hideDuplicatePaths })
                }
            />

            <div>
                Zoom
                <span style={{ marginLeft: 8 }} />
                <Float
                    value={view.zoom}
                    onChange={(zoom) => onChange({ ...view, zoom })}
                />
                <span style={{ marginLeft: 16 }} />
                Offset
                <span style={{ marginLeft: 8 }} />
                <Float
                    value={view.center.x}
                    onChange={(x) =>
                        onChange({ ...view, center: { ...view.center, x } })
                    }
                />
                <Float
                    value={view.center.y}
                    onChange={(y) =>
                        onChange({ ...view, center: { ...view.center, y } })
                    }
                />
            </div>
            <div>
                {['texture1', 'texture2'].map((id, i) => (
                    <button
                        key={id}
                        css={{
                            backgroundColor: 'transparent',
                            padding: '4px 8px',
                            border: '1px solid #aaa',
                            color: 'white',
                            cursor: 'pointer',
                            margin: 4,
                        }}
                        style={
                            view.texture?.id === id
                                ? {
                                      backgroundColor: '#555',
                                  }
                                : {}
                        }
                        onClick={() => {
                            onChange({
                                ...view,
                                texture:
                                    view.texture?.id === id
                                        ? undefined
                                        : {
                                              scale: 0.5,
                                              intensity: 0.5,
                                              ...view.texture,
                                              id,
                                          },
                            });
                        }}
                    >
                        {id}
                    </button>
                ))}
                {view.texture ? (
                    <button
                        onClick={() => {
                            onChange({ ...view, texture: undefined });
                        }}
                    >
                        Clear texture
                    </button>
                ) : null}
                {view.texture ? (
                    <div>
                        Scale (0-1)
                        <Float
                            value={view.texture.scale}
                            onChange={(scale) =>
                                onChange({
                                    ...view,
                                    texture: {
                                        ...view.texture!,
                                        scale: Math.min(Math.max(0, scale), 1),
                                    },
                                })
                            }
                        />
                    </div>
                ) : null}
                Sketchiness
                <Float
                    value={view.sketchiness || 0}
                    onChange={(sketchiness) =>
                        onChange({
                            ...view,
                            sketchiness,
                        })
                    }
                />
            </div>
            <div
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 8,
                }}
            >
                <div css={{ marginRight: 8 }}>Background</div>
                <Color
                    color={view.background}
                    onChange={(background) => {
                        onChange({
                            ...view,
                            background:
                                background === 'transparent'
                                    ? undefined
                                    : background,
                        });
                    }}
                    palette={palette}
                    extra={backgrounds}
                />
            </div>
            {/* {view.clip ? (
                <button
                    onClick={() => onChange({ ...view, clip: undefined })}
                    onMouseOver={() => onHoverClip(true)}
                    onMouseOut={() => onHoverClip(false)}
                >
                    Clear clip
                </button>
            ) : null} */}
        </div>
    );
};
