import * as React from 'react';

export function itemStyle(selected: boolean, subSelected = false): React.CSSProperties | undefined {
    return {
        padding: 8,
        cursor: 'pointer',
        marginBottom: 0,
        '--hover-color': 'var(--surface-hover)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: selected ? '#555' : subSelected ? '#055' : '',
    };
}
