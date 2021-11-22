/* @jsx jsx */
import * as React from 'react';
import { jsx } from '@emotion/react';
import { Coord, Id, Mirror } from './types';
import { Toggle, Label, Int } from './Forms';
import {
    angleTo,
    applyMatrices,
    dist,
    getTransformsForMirror,
    Matrix,
    push,
} from './getMirrorTransforms';

export const ShowMirror = ({
    mirror,
    transforms,
}: {
    mirror: Mirror;
    transforms: Array<Array<Matrix>>;
}) => {
    const angle = angleTo(mirror.point, mirror.origin);
    const d = dist(mirror.point, mirror.origin);
    const base = push(mirror.point, angle, d / 2);
    const off = mirror.reflect ? push(base, angle + Math.PI / 2, d / 6) : base;
    const line = { p1: mirror.point, p2: off };

    const lines: Array<{ p1: Coord; p2: Coord }> = [line];
    transforms.forEach((transform) => {
        lines.push({
            p1: applyMatrices(line.p1, transform),
            p2: applyMatrices(line.p2, transform),
        });
    });
    const minX = lines.reduce((a, b) => Math.min(a, b.p1.x, b.p2.x), Infinity);
    const minY = lines.reduce((a, b) => Math.min(a, b.p1.y, b.p2.y), Infinity);
    const maxX = lines.reduce((a, b) => Math.max(a, b.p1.x, b.p2.x), -Infinity);
    const maxY = lines.reduce((a, b) => Math.max(a, b.p1.y, b.p2.y), -Infinity);
    const width = maxX - minX;
    const height = maxY - minY;

    const size = 200;

    const scale = width < height ? size / height : size / width;

    const xoff = (minX - (width < height ? (height - width) / 2 : 0)) * scale;
    const yoff = (minY - (height < width ? (width - height) / 2 : 0)) * scale;

    return (
        <svg width={size} height={size} style={{ display: 'block' }}>
            {lines.map((line, i) => (
                <line
                    key={i}
                    stroke="red"
                    x1={line.p1.x * scale - xoff}
                    y1={line.p1.y * scale - yoff}
                    x2={line.p2.x * scale - xoff}
                    y2={line.p2.y * scale - yoff}
                />
            ))}
        </svg>
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
    onChild,
    mirrors,
}: {
    mirror: Mirror;
    mirrors: { [key: Id]: Mirror };
    isActive: boolean;
    selected: boolean;
    onMouseOver: () => void;
    onMouseOut: () => void;
    setSelected: (sel: boolean) => void;
    onChange: (m: Mirror) => unknown;
    onSelect: () => void;
    onDuplicate: () => void;
    onChild: () => void;
}) => {
    const transforms = React.useMemo(() => {
        return getTransformsForMirror(mirror.id, mirrors);
    }, [mirror.id, mirrors]);

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
                label="Reflect across axis?"
                value={mirror.reflect}
                onChange={(reflect) => onChange({ ...mirror, reflect })}
            />
            <div css={{ display: 'flex', flexDirection: 'row' }}>
                <Label text="rotations" />
                <div style={{ flexBasis: 8 }} />
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
                {/* I'm not sure these are even helpful */}
                {/* {mirror.rotational.map((enabled, i) => (
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
                ))} */}
            </div>
            <button
                onClick={() => {
                    onDuplicate();
                }}
            >
                Duplicate
            </button>
            <button
                onClick={() => {
                    onChild();
                }}
            >
                Create child mirror
            </button>
            <ShowMirror mirror={mirror} transforms={transforms} />
        </div>
    );
};
