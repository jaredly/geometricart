import React, {useState} from 'react';
import {State} from '../types';
import {Action} from '../state/Action';
import {UndoItem} from './Sidebar';

export function UndoPanel({
    state,
    dispatch,
}: {
    state: State;
    dispatch: (action: Action) => unknown;
}) {
    const [tick, setTick] = useState(0);
    const [branch, setBranch] = React.useState(state.history.currentBranch);
    const current = state.history.branches[+branch];
    return (
        <div
            css={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div className="flex flex-row">
                <select
                    css={{display: 'block', flex: 1}}
                    value={branch}
                    onChange={(evt) => setBranch(+evt.target.value)}
                >
                    {Object.keys(state.history.branches).map((k) => (
                        <option value={k} key={k}>
                            Branch {k}
                        </option>
                    ))}
                </select>
                <button onClick={() => setTick(tick + 1)}>Refresh</button>
            </div>
            <div>{current.items.length} items</div>
            {current.parent ? (
                <div
                    onClick={() => setBranch(current.parent!.branch)}
                    css={{
                        padding: '4px 8px',
                        border: '1px solid #aaa',
                        cursor: 'pointer',
                        ':hover': {
                            backgroundColor: 'rgba(255,255,255,0.5)',
                        },
                    }}
                >
                    Parent branch: {current.parent.branch} @ {current.parent.idx}
                </div>
            ) : (
                'No parent'
            )}
            <div
                css={{
                    overflow: 'auto',
                    flex: 1,
                    minHeight: 0,
                }}
            >
                {current.items.map((item, i) => (
                    <div
                        key={`${i}`}
                        css={{
                            padding: 8,
                        }}
                    >
                        <UndoItem item={item} />
                    </div>
                ))}
            </div>
        </div>
    );
}
