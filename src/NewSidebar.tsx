import { Card } from 'primereact/card';
import * as React from 'react';
import { Action } from './state/Action';
import { State } from './types';
import { RadioButton } from 'primereact/radiobutton';

export const NewSidebar = ({
    state,
    dispatch,
}: {
    state: State;
    dispatch: React.Dispatch<Action>;
}): JSX.Element => {
    return (
        <div style={{ minWidth: 200, padding: 16, background: '#888' }}>
            <Card>
                <span>Mirrors</span>
                {Object.entries(state.mirrors).map(([k, mirror]) => (
                    <div key={k} className="field-radiobutton">
                        <RadioButton
                            checked={state.activeMirror === k}
                            inputId={k}
                            onChange={(evt) => {
                                if (state.activeMirror !== evt.value) {
                                    dispatch({
                                        type: 'mirror:active',
                                        id: evt.value,
                                    });
                                } else {
                                    dispatch({
                                        type: 'mirror:active',
                                        id: null,
                                    });
                                }
                            }}
                            name="mirror"
                            value={k}
                        />
                        <label htmlFor={k}>
                            {mirror.rotational.length}x at{' '}
                            {mirror.origin.x.toFixed(2)},
                            {mirror.origin.y.toFixed(2)}
                        </label>
                    </div>
                ))}
                {/* <Divider /> */}
                <span>Guides</span>
                <span>Shapes</span>
            </Card>
        </div>
    );
};
