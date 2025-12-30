import {useMemo} from 'react';
import {CheckboxChecked, CheckboxUnchecked} from '../../../icons/Icon';
import {Box} from './export-types';
import {matchPath} from './RenderDebug';
import {LogItem, RenderLog} from './resolveMods';
import {Bounds} from '../../../editor/Bounds';
import {aabbContains} from '../../shapesFromSegments';

const boxToBounds = (box: Box): Bounds => {
    return {x0: box.x, y0: box.y, x1: box.x + box.width, y1: box.y + box.height};
};

const inBox = (bounds: Bounds, item: LogItem) => {
    switch (item.type) {
        case 'point':
            return aabbContains(bounds, item.p);
        case 'seg':
            return aabbContains(bounds, item.prev) || aabbContains(bounds, item.seg.to);
        case 'shape':
            return (
                aabbContains(bounds, item.shape.origin) ||
                item.shape.segments.some((seg) => aabbContains(bounds, seg.to))
            );
    }
};

export const ShowRenderLog = ({
    log,
    path,
    onSelect,
    selection,
    filterBox,
}: {
    filterBox?: Box;
    selection: number[];
    log: RenderLog;
    path: number[];
    onSelect: (n: number[]) => void;
}) => {
    const filteredItems = useMemo(() => {
        if (!filterBox || log.type !== 'items') return;
        const bounds = boxToBounds(filterBox);
        return log.items
            .map((item, i) => ({item, i}))
            .filter((item) =>
                Array.isArray(item.item.item)
                    ? item.item.item.some((item) => inBox(bounds, item))
                    : inBox(bounds, item.item.item),
            );
    }, [log, filterBox]);

    if (log.type === 'items') {
        const sel = matchPath(path, selection);
        const v = sel != null && sel !== -1 ? log.items[sel] : null;
        return (
            <div className={sel != null ? 'bg-base-100' : ''}>
                <div>
                    {log.title}
                    <button
                        onClick={() => onSelect(sel === -1 ? [] : path.concat([-1]))}
                        className={'btn btn-square '}
                    >
                        {sel === -1 ? <CheckboxChecked /> : <CheckboxUnchecked />}
                    </button>
                    {sel?.toString()} {v?.text ?? 'No text'}
                </div>
                {log.items.length > 1 ? (
                    <div>
                        <input
                            type="range"
                            className="range"
                            value={
                                filteredItems
                                    ? filteredItems.findIndex((f) => f.i === sel)
                                    : (sel ?? 0)
                            }
                            min={0}
                            max={(filteredItems ?? log.items).length - 1}
                            onClick={() =>
                                sel === -1 || sel == null
                                    ? onSelect(
                                          path.concat([filteredItems ? filteredItems[0].i : 0]),
                                      )
                                    : null
                            }
                            onChange={(evt) =>
                                onSelect(
                                    path.concat([
                                        filteredItems
                                            ? filteredItems[+evt.target.value].i
                                            : +evt.target.value,
                                    ]),
                                )
                            }
                        />
                        {(filteredItems ?? log.items).length}
                    </div>
                ) : null}
            </div>
        );
    }

    const sel = matchPath(path, selection);
    return (
        <details>
            <summary className="cursor-pointer">
                {log.title} ({log.children.length})
                <button
                    onClick={(evt) => {
                        evt.preventDefault();
                        onSelect(sel === -1 ? [] : path.concat([-1]));
                    }}
                    className={'btn btn-square '}
                >
                    {sel === -1 ? <CheckboxChecked /> : <CheckboxUnchecked />}
                </button>
            </summary>
            <div className="p-2 ml-10">
                {log.children.map((child, i) => (
                    <ShowRenderLog
                        filterBox={filterBox}
                        key={i}
                        log={child}
                        path={path.concat([i])}
                        onSelect={onSelect}
                        selection={selection}
                    />
                ))}
            </div>
        </details>
    );
};
