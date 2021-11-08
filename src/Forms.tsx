/* @jsx jsx */
/* @jsxFrag React.Fragment */
import { jsx } from '@emotion/react';
import * as React from 'react';
import { Circle, Guide, Mirror, PathGroup, Style } from './types';

export const Int = ({
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
}: {
    color: string | undefined;
    onChange: (color: string | undefined) => void;
}) => {
    const options = ['red', 'green', 'blue', 'orange', 'white'];
    return (
        <div>
            {options.map((name, i) => (
                <button
                    onClick={() => onChange(name)}
                    css={{
                        background: name,
                        border: `2px solid ${
                            color === name ? 'white' : 'transparent'
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
            css={{ cursor: 'pointer', padding: 4 }}
            onClick={() => onChange(!value)}
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
    onChange,
}: {
    style: Style;
    onChange: (s: Style) => unknown;
}) => {
    return (
        <div>
            Fills:
            {style.fills.map((fill, i) =>
                fill ? (
                    <div key={i}>
                        <Color
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
    onChange,
}: {
    group: PathGroup;
    onChange: (group: PathGroup) => unknown;
}) => {
    return (
        <div css={{ padding: 4 }}>
            <div>Path Group</div>
            <StyleForm
                style={group.style}
                onChange={(style) => onChange({ ...group, style })}
            />
        </div>
    );
};

export const GuideForm = ({
    guide,
    onChange,
}: {
    guide: Guide;
    onChange: (guide: Guide) => unknown;
}) => {
    return (
        <div
            css={{
                padding: 4,
            }}
        >
            <div
                css={{
                    cursor: 'pointer',
                    background: guide.active
                        ? 'rgba(100,100,100,0.4)'
                        : 'rgba(100,100,100,0.1)',
                    ':hover': {
                        background: 'rgba(100,100,100,0.2)',
                    },
                }}
                onClick={() => onChange({ ...guide, active: !guide.active })}
            >
                {guide.geom.type} Guide {guide.active ? '(active)' : null}
            </div>
            {guide.geom.type === 'Circle' ? (
                <>
                    <Int
                        value={guide.geom.multiples}
                        onChange={(multiples) =>
                            multiples >= 0
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
                </>
            ) : null}
        </div>
    );
};

export const MirrorForm = ({
    mirror,
    onChange,
    onSelect,
    isActive,
}: {
    mirror: Mirror;
    isActive: boolean;
    onChange: (m: Mirror) => unknown;
    onSelect: () => void;
}) => {
    return (
        <div
            css={{
                padding: 8,
            }}
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
                    value={mirror.rotational.length}
                    onChange={(number) => {
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
        </div>
    );
};
