import {useMemo, useState} from 'react';
import {Tiling} from '../../../types';
import {example} from './example';
import {State} from './export-types';
import {RenderExport} from './RenderExport';
import {StateEditor} from './StateEditor';

export const PatternExport = ({tiling, id}: {tiling: Tiling; id: string}) => {
    // const [state, setState] = useState<State>(example(id));
    const state: State = example(id);
    const setState = (m: State) => {};

    const patterns = useMemo(() => ({[id]: tiling}), [id, tiling]);

    return (
        <div className="flex">
            <RenderExport state={state} patterns={patterns} />
            <div className="max-h-250 overflow-auto flex-1">
                <StateEditor value={state} onChange={setState} />
            </div>
        </div>
    );
};
