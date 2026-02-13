import {useMemo, useRef} from 'react';
import {RoundPlus} from '../../../../icons/Icon';
import {useValue} from '../../../../json-diff/react';
import {useExportState} from '../ExportHistory';
import {StateEditor} from '../state-editor/StateEditor';
import {AccordionSidebar} from './AccordionSidebar';
import {Exports} from './Exports';
import {HistoryAndSnapshots} from './HistoryAndSnapshots';
import {LayerEditor} from './LayerEditor';
import {MoveBar} from './MoveBar';
import {useResettingState, useWindowState} from './state';
import {StyleConfig} from './StyleConfig';
import {usePendingState} from '../utils/editState';
import {genid} from '../utils/genid';

export const Sidebar = () => {
    const sctx = useExportState();
    const state = useValue(sctx.$);

    const v = useWindowState();
    const swidth = useValue(v.$.rightBarSize);
    const expanded = useValue(v.$.sectionsExpanded);
    const pendingContext = usePendingState();
    const ctx = useExportState();

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
                title: (
                    <div className="flex justify-between items-center">
                        Layers
                        <div
                            onClick={(evt) => {
                                evt.stopPropagation();
                            }}
                            className="p-2 hover:bg-amber-400 hover:text-amber-950 rounded-4xl transition-colors"
                        >
                            <RoundPlus />
                        </div>
                    </div>
                ),
                body: <LayerEditor />,
                key: 'layer',
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
            {
                title: (
                    <div className="flex justify-between items-center">
                        Exports
                        <div
                            onClick={(evt) => {
                                evt.stopPropagation();
                                pendingContext.$.pending.$replace({
                                    type: 'rect',
                                    points: [],
                                    startCenter: true,
                                    onDone(box) {
                                        const id = genid();
                                        ctx.$.exports[id].$add({
                                            id,
                                            config: {type: '2d', scale: state.view.ppu, box},
                                        });
                                    },
                                });
                            }}
                            className="p-2 hover:bg-amber-400 hover:text-amber-950 rounded-4xl transition-colors"
                        >
                            <RoundPlus />
                        </div>
                    </div>
                ),
                key: 'exports',
                body: <Exports />,
                noCache: true,
            },
        ];
    }, [state, sctx, pendingContext, ctx]);

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
