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

export const StyleForm = ({
    style,
    onChange,
}: {
    style: Style;
    onChange: (s: Style) => unknown;
}) => {
    return (
        <div>
            {style.fills.map((fill, i) =>
                fill ? (
                    <div key={i}>{fill.color}</div>
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
            {group.style.fills}
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
