import { Divider, Paper, Radio, Text } from '@mantine/core';
import * as React from 'react';
import { Action } from './state/Action';
import { State } from './types';

export const NewSidebar = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}): JSX.Element => {
    return (
        <div style={{ minWidth: 200, padding: 16, background: '#888' }}>
            <Paper>
                <Text p="xs" c="dimmed" fz="xs">
                    Mirrors
                </Text>
                <Divider variant="dashed" />
                {Object.entries(state.mirrors).map(([k, mirror]) => (
                    <Radio
                        p="xs"
                        checked={state.activeMirror === k}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            if (state.activeMirror !== k) {
                                dispatch({ type: 'mirror:active', id: k });
                            } else {
                                dispatch({ type: 'mirror:active', id: null });
                            }
                        }}
                        label={
                            <Text key={k}>
                                {mirror.rotational.length}x at{' '}
                                {mirror.origin.x.toFixed(2)},
                                {mirror.origin.y.toFixed(2)}
                            </Text>
                        }
                    />
                ))}
                <Divider />
                <Text p="xs" c="dimmed">
                    Guides
                </Text>
                <Divider />
                <Text p="xs" c="dimmed">
                    Shapes
                </Text>
            </Paper>
            Sidebarz
        </div>
    );
};
