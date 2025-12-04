import React, {useRef, useState, useMemo, useEffect} from 'react';

export interface Item {
    key: string;
    render: (handleProps: HandleProps) => React.ReactElement;
}
export type HandleProps = {
    isActive: boolean;
    props: {
        onDragStart: React.DragEventHandler;
        // onDragOver: React.DragEventHandler;
        // onDragEnd: React.DragEventHandler;
    };
};

export interface Props {
    items: Item[];
    onReorder: (prevIndex: number, newIndex: number) => void;
}

type DragState = {
    fromIndex: number; // index of dragged item in the items array
    activeKey: string; // key of dragged item
    insertionIndex: number; // 0..items.length (slot between items)
} | null;

// Find the nearest scrollable ancestor (by overflow/overflowY),
// otherwise fall back to window.
function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
    if (!node || typeof window === 'undefined') return window;

    const overflowRegex = /(auto|scroll)/;

    let parent = node.parentElement;
    while (parent) {
        const style = getComputedStyle(parent);
        const hasScrollableOverflow =
            overflowRegex.test(style.overflowY) || overflowRegex.test(style.overflow);

        if (hasScrollableOverflow && parent.scrollHeight > parent.clientHeight) {
            return parent;
        }

        parent = parent.parentElement;
    }

    return window;
}

export const DragToReorderList: React.FC<Props> = ({items, onReorder}) => {
    const [dragState, setDragState] = useState<DragState>(null);

    const rootRef = useRef<HTMLDivElement | null>(null);
    const scrollParentRef = useRef<HTMLElement | Window | null>(null);

    // Determine scroll parent once the root is in the DOM
    useEffect(() => {
        if (rootRef.current) {
            scrollParentRef.current = getScrollParent(rootRef.current);
        }
    }, []);

    const keyToIndex = useMemo(() => {
        const map = new Map<string, number>();
        items.forEach((item, index) => map.set(item.key, index));
        return map;
    }, [items]);

    const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
        const key = items[index]?.key;
        if (!key) return;

        setDragState({
            fromIndex: index,
            activeKey: key,
            insertionIndex: index, // start with inserting at current spot
        });

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key); // required in some browsers
    };

    // Called when dragging over a specific item
    const handleItemDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        if (!dragState) return;

        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const insertionIndex = offsetY < rect.height / 2 ? index : index + 1; // above vs below

        const clamped = Math.max(0, Math.min(items.length, insertionIndex));

        if (clamped === dragState.insertionIndex) return;

        setDragState((prev) => (prev ? {...prev, insertionIndex: clamped} : prev));
    };

    const finalizeReorder = () => {
        setDragState((prev) => {
            if (!prev) return null;

            const {fromIndex} = prev;
            let {insertionIndex} = prev;

            // Convert insertionIndex (slot) to final index in the array
            // after removal of the original item.
            //
            // Example:
            //   items = [0,1,2,3]
            //   drag 1 (fromIndex=1) to slot after 2 (insertionIndex=3)
            //   remove 1 => [0,2,3]
            //   final index should be 2
            //   insertionIndex(3) > fromIndex(1) => target = 3 - 1 = 2
            let targetIndex = insertionIndex;
            if (insertionIndex > fromIndex) {
                targetIndex = insertionIndex - 1;
            }

            if (targetIndex !== fromIndex) {
                onReorder(fromIndex, targetIndex);
            }

            return null; // clear drag state
        });
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        finalizeReorder();
    };

    const handleDragEnd = () => {
        // If drag ends without dropping in our root, just reset
        setDragState(null);
    };

    // Auto-scroll while dragging near top/bottom of the scroll parent
    const handleRootDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        const scrollParent = scrollParentRef.current;
        if (!scrollParent) return;

        const y = e.clientY;
        const edgeSize = 40; // px from top/bottom to trigger scroll
        const scrollSpeed = 10; // px per event

        if (scrollParent instanceof Window) {
            const viewportTop = 0;
            const viewportBottom = window.innerHeight || document.documentElement.clientHeight;

            if (y < viewportTop + edgeSize) {
                window.scrollBy({top: -scrollSpeed});
            } else if (y > viewportBottom - edgeSize) {
                window.scrollBy({top: scrollSpeed});
            }
        } else {
            const rect = scrollParent.getBoundingClientRect();
            const top = rect.top;
            const bottom = rect.bottom;

            if (y < top + edgeSize) {
                scrollParent.scrollTop -= scrollSpeed;
            } else if (y > bottom - edgeSize) {
                scrollParent.scrollTop += scrollSpeed;
            }
        }
    };

    const activeKey = dragState?.activeKey ?? null;
    const insertionIndex = dragState?.insertionIndex ?? null;

    const renderIndicator = (slotIndex: number) => {
        if (insertionIndex === null || insertionIndex !== slotIndex) return null;
        return (
            <div
                style={{
                    height: 0,
                    borderTop: '2px solid #007bff',
                    margin: '4px 2px',
                    borderRadius: 1,
                }}
            />
        );
    };

    return (
        <div
            ref={rootRef}
            onDragOver={handleRootDragOver}
            onDrop={handleDrop}
            style={{
                // No maxHeight/overflow required here; can stretch naturally
                padding: 4,
                fontFamily: 'sans-serif',
            }}
        >
            {/* Slot before the first item */}
            {renderIndicator(0)}

            {items.map((item, index) => {
                const isActive = item.key === activeKey;

                return (
                    <React.Fragment key={item.key}>
                        <div onDragOver={handleItemDragOver(index)} onDragEnd={handleDragEnd}>
                            {item.render({
                                isActive,
                                props: {
                                    onDragStart: handleDragStart(index),
                                },
                            })}
                        </div>

                        {/* Slot after this item */}
                        {renderIndicator(index + 1)}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
