import {useEffect, useMemo, useState} from 'react';
import {Tiling} from '../../../types';
import {ProvideEditState} from './editState';
import {example} from './example';
import {State} from './export-types';
import {RenderExport} from './RenderExport';
import {StateEditor} from './state-editor/StateEditor';

export const PatternExport = ({tiling, id}: {tiling: Tiling; id: string}) => {
    const [state, setState] = useState<State>(example(id));

    // biome-ignore lint/correctness/useExhaustiveDependencies : this is for hot refresh
    useEffect(() => {
        setState(example(id));
    }, [example, id]);

    const patterns = useMemo(() => ({[id]: tiling}), [id, tiling]);

    return (
        <ProvideEditState>
            <div className="flex">
                <RenderExport state={state} patterns={patterns} />
                <div className="max-h-250 overflow-auto flex-1">
                    <StateEditor value={state} onChange={setState} />
                </div>
            </div>
        </ProvideEditState>
    );
};
