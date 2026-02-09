import {useEffect, useMemo, useRef, useState} from 'react';
import {useValue} from '../../../../json-diff/react';
import {useExportState} from '../ExportHistory';
import {WorkerSend} from '../render/render-client';
import {SnapshotUrl} from '../state-editor/saveAnnotation';
import {StateEditor} from '../state-editor/StateEditor';
import {useLatest} from '../utils/useLatest';
import {useResettingState, useWindowState} from './state';

const MoveBar = ({onMove, onCommit}: {onMove(v: number): void; onCommit(): void}) => {
    const [moving, setMoving] = useState(false);
    const cb = useLatest({onMove, onCommit});
    useEffect(() => {
        if (!moving) return;
        const fn = (evt: MouseEvent) => {
            cb.current.onMove(evt.clientX);
        };
        const up = () => {
            setMoving(false);
            cb.current.onCommit();
        };
        document.addEventListener('mousemove', fn);
        document.addEventListener('mouseup', up);
        return () => {
            document.removeEventListener('mousemove', fn);
            document.removeEventListener('mouseup', up);
        };
    }, [moving, cb]);

    return (
        <div
            onMouseDown={(evt) => {
                evt.stopPropagation();
                evt.preventDefault();
                setMoving(true);
            }}
            style={{
                width: 5,
            }}
            className={'hover:bg-amber-200 cursor-pointer' + (moving ? ' bg-amber-200' : '')}
        >
            I
        </div>
    );
};

const AccordionSidebar = ({
    items,
    expanded,
    setExpanded,
}: {
    items: {title: React.ReactNode; body: React.ReactNode; key: string}[];
    expanded: Record<string, boolean>;
    setExpanded: (key: string, expanded: boolean) => void;
}) => {
    const everExpanded = useMemo<Record<string, boolean>>(() => ({}), []);
    Object.keys(expanded).forEach((k) => {
        if (expanded[k]) everExpanded[k] = true;
    });
    return (
        <div>
            Accordion sidebar
            {items.map((item) => (
                <div key={item.key}>
                    <div onClick={() => setExpanded(item.key, !expanded[item.key])}>
                        {item.title}
                    </div>
                    {everExpanded ? (
                        <div className={expanded[item.key] ? '' : 'hidden'}>{item.body}</div>
                    ) : null}
                </div>
            ))}
        </div>
    );
};

export const Sidebar = ({worker, snapshotUrl}: {worker: WorkerSend; snapshotUrl: SnapshotUrl}) => {
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
                body: (
                    <StateEditor
                        snapshotUrl={snapshotUrl}
                        value={state}
                        update={sctx.$}
                        worker={worker}
                    />
                ),
                key: 'state',
            },
        ];
    }, [snapshotUrl, state, sctx, worker]);

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
