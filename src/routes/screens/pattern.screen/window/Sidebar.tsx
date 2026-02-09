import {useMemo, useRef} from 'react';
import {useValue} from '../../../../json-diff/react';
import {useExportState} from '../ExportHistory';
import {WorkerSend} from '../render/render-client';
import {SnapshotUrl} from '../state-editor/saveAnnotation';
import {StateEditor} from '../state-editor/StateEditor';
import {useResettingState, useWindowState} from './state';
import {AccordionSidebar} from './AccordionSidebar';
import {MoveBar} from './MoveBar';
import {StyleConfig} from './StyleConfig';
import {HistoryAndSnapshots} from './HistoryAndSnapshots';

export const Sidebar = () => {
    const sctx = useExportState();
    const state = useValue(sctx.$);

    const v = useWindowState();
    const swidth = useValue(v.$.rightBarSize);
    const expanded = useValue(v.$.sectionsExpanded);

    const [width, setWidth] = useResettingState(swidth);
    const self = useRef<HTMLDivElement>(null);

    const items = useMemo(() => {
        return [
            {
                title: 'State',
                body: <StateEditor value={state} update={sctx.$} />,
                key: 'state',
            },
            {
                title: 'Style Config',
                key: 'styleConfig',
                body: <StyleConfig />,
            },
            {
                title: 'History & Snapshots',
                key: 'history & snapshots',
                body: <HistoryAndSnapshots />,
            },
        ];
    }, [state, sctx]);

    return (
        <div style={{width}} ref={self} className="flex self-stretch items-stretch">
            <MoveBar
                onMove={(x) => {
                    const right = self.current?.getBoundingClientRect().right;
                    if (right != null) setWidth(right - x);
                }}
                onCommit={() => v.$.rightBarSize.$replace(width)}
            />
            <AccordionSidebar
                items={items}
                expanded={expanded}
                setExpanded={(k, ex) => v.$.sectionsExpanded[k].$replace(ex)}
            />
        </div>
    );
};
