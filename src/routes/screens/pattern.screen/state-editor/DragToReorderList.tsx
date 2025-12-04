import React, {useRef, useState, useMemo} from 'react';

export interface Item {
    key: string;
    node: React.ReactElement;
}

export interface Props {
    items: Item[];
    onReorder: (prevIndex: number, newIndex: number) => void;
}

type DragState = {
    fromIndex: number; // index of dragged item in the items array
    activeKey: string; // key of dragged item
    insertionIndex: number; // 0..items.length (slot between items)
} | null;

export const DragToReorderList: React.FC<Props> = ({items, onReorder}) => {
    const [dragState, setDragState] = useState<DragState>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

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

        // Clamp to [0, items.length]
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

            // No-op if nothing effectively changed
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
        // If drag ends without a drop in the container, just reset without reordering
        setDragState(null);
    };

    // Auto-scroll while dragging near top/bottom of container
    const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        const el = containerRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const y = e.clientY;

        const edgeSize = 40; // px from top/bottom to trigger scroll
        const scrollSpeed = 10; // px per event

        if (y < rect.top + edgeSize) {
            el.scrollTop -= scrollSpeed;
        } else if (y > rect.bottom - edgeSize) {
            el.scrollTop += scrollSpeed;
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
            ref={containerRef}
            onDragOver={handleContainerDragOver}
            onDrop={handleDrop}
            style={{
                // maxHeight: 200,
                // width: 250,
                border: '1px solid #ccc',
                borderRadius: 4,
                overflowY: 'auto',
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
                        <div
                            draggable
                            onDragStart={handleDragStart(index)}
                            onDragOver={handleItemDragOver(index)}
                            onDragEnd={handleDragEnd}
                            style={{
                                padding: '8px 12px',
                                marginTop: 4,
                                marginBottom: 4,
                                background: isActive ? '#e0f0ff' : 'white',
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                cursor: 'grab',
                                boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                            }}
                        >
                            {item.node}
                        </div>

                        {/* Slot after this item */}
                        {renderIndicator(index + 1)}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
