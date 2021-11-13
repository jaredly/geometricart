/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import * as React from 'react';
import { transparent } from './Icons';
import {
    Circle,
    Guide,
    Line,
    Mirror,
    Path,
    PathGroup,
    Style,
    View,
} from './types';

export const Text = ({
    value,
    onChange,
    multiline,
}: {
    value: string;
    onChange: (v: string) => void;
    multiline?: boolean;
}) => {
    const [text, setText] = React.useState(null as null | string);
    const shared = {
        value: text ?? value,
        onChange: (
            evt: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => setText(evt.target.value),
        onBlur: () => {
            if (text != null) {
                onChange(text);
                setText(null);
            }
        },
    };
    return multiline ? (
        <textarea {...shared} />
    ) : (
        <input type="text" {...shared} />
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
}: {
    color: string | undefined | number;
    onChange: (color: string | undefined | number) => void;
    palette: Array<string>;
}) => {
    const options = ['black', 'white', 'transparent'];
    return (
        <div>
            {palette.map((item, i) => (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    style={{
                        border: `2px solid ${color === i ? 'white' : '#444'}`,
                    }}
                    css={{
                        background: item,
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                    }}
                />
            ))}
            {options.map((name, i) => (
                <button
                    key={name}
                    onClick={() => onChange(name)}
                    css={{
                        background:
                            name === 'transparent'
                                ? `url("${transparent}")`
                                : name,
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
    const ref = React.useRef(null as null | HTMLDivElement);
    const [expanded, setExpanded] = React.useState(false);
    React.useEffect(() => {
        if (selected) {
            ref.current?.scrollIntoView(false);
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
                css={{ display: 'flex', alignItems: 'center' }}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '🔻' : '▶️'}
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
            {expanded ? (
                <StyleForm
                    palette={palette}
                    style={group.style}
                    onChange={(style) => onChange({ ...group, style })}
                />
            ) : null}
        </div>
    );
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
        if (selected) {
            ref.current?.scrollIntoView(false);
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
                    alignItems: 'center',
                }}
            >
                Path! {path.id}
                <div style={{ flex: 1 }} />
                <button onClick={onDelete}>Delete</button>
            </div>
            <Toggle
                label="Hide"
                value={path.hidden}
                onChange={(hidden) => onChange({ ...path, hidden })}
            />
            <StyleForm
                palette={palette}
                style={path.style}
                onChange={(style) => onChange({ ...path, style })}
            />
            {path.group ? `Group: ${path.group}` : `No group...`}
        </div>
    );
};

export const GuideForm = ({
    guide,
    selected,
    onChange,
    onMouseOver,
    onMouseOut,
}: {
    guide: Guide;
    selected: boolean;
    onChange: (guide: Guide) => unknown;
    onMouseOver: () => void;
    onMouseOut: () => void;
}) => {
    const [expanded, setExpanded] = React.useState(false);
    const ref = React.useRef(null as null | HTMLDivElement);
    React.useEffect(() => {
        if (selected) {
            ref.current?.scrollIntoView(false);
        }
    }, [selected]);
    return (
        <div
            ref={(node) => (ref.current = node)}
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
                        <Toggle
                            value={guide.geom.limit}
                            onChange={(limit) => {
                                onChange({
                                    ...guide,
                                    geom: { ...(guide.geom as Line), limit },
                                });
                            }}
                            label="Restrict to segment"
                        />
                    ) : null}
                </>
            ) : null}
        </div>
    );
};

export const ViewForm = ({
    view,
    onChange,
}: {
    view: View;
    onChange: (view: View) => unknown;
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

            <div>
                Zoom
                <Float
                    value={view.zoom}
                    onChange={(zoom) => onChange({ ...view, zoom })}
                />
            </div>
            <div>
                Offset
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
            <div
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 8,
                }}
            >
                <div css={{ marginRight: 8 }}>Background</div>
                {backgrounds.map((color, i) => (
                    <div
                        key={color}
                        css={{
                            width: 20,
                            height: 20,
                            margin: 4,
                        }}
                        style={{
                            background:
                                color === 'transparent'
                                    ? `url("${transparent}")`
                                    : color,
                            border: (
                                color === 'transparent'
                                    ? !view.background
                                    : color === view.background
                            )
                                ? `2px solid white`
                                : '2px solid #888',
                        }}
                        onClick={() => {
                            onChange({
                                ...view,
                                background:
                                    color === 'transparent' ? undefined : color,
                            });
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export const MirrorForm = ({
    mirror,
    onMouseOver,
    onMouseOut,
    onChange,
    onSelect,
    isActive,
    selected,
    setSelected,
    onDuplicate,
}: {
    mirror: Mirror;
    isActive: boolean;
    selected: boolean;
    onMouseOver: () => void;
    onMouseOut: () => void;
    setSelected: (sel: boolean) => void;
    onChange: (m: Mirror) => unknown;
    onSelect: () => void;
    onDuplicate: () => void;
}) => {
    return (
        <div
            css={{
                padding: 8,
            }}
            style={selected ? { border: '1px solid white' } : {}}
            onClick={(evt) => {
                evt.stopPropagation();
                setSelected(true);
            }}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
        >
            <div
                css={{
                    cursor: 'pointer',
                    background: isActive
                        ? 'rgba(100,100,100,0.4)'
                        : 'rgba(100,100,100,0.1)',
                    ':hover': {
                        background: 'rgba(100,100,100,0.2)',
                    },
                }}
                onClick={onSelect}
            >
                Mirror {isActive ? '(active)' : null}
            </div>
            <Toggle
                label="Mirror?"
                value={mirror.reflect}
                onChange={(reflect) => onChange({ ...mirror, reflect })}
            />
            <div>
                <Label text="rotations" />
                <Int
                    value={mirror.rotational.length + 1}
                    onChange={(number) => {
                        if (number == null || number < 1) {
                            return;
                        }
                        number -= 1;
                        let rotational = mirror.rotational;
                        if (number < mirror.rotational.length) {
                            rotational = rotational.slice(0, number);
                        } else {
                            rotational = rotational.slice();
                            for (let i = rotational.length; i < number; i++) {
                                rotational.push(true);
                            }
                        }
                        onChange({ ...mirror, rotational });
                    }}
                />
            </div>
            <div css={{ display: 'flex' }}>
                {mirror.rotational.map((enabled, i) => (
                    <Toggle
                        key={i}
                        label={'' + i}
                        value={enabled}
                        onChange={(enabled) => {
                            const rotational = mirror.rotational.slice();
                            rotational[i] = enabled;
                            onChange({ ...mirror, rotational });
                        }}
                    />
                ))}
            </div>
            <button
                onClick={() => {
                    onDuplicate();
                }}
            >
                Duplicate
            </button>
        </div>
    );
};
