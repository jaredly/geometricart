import {useState, useEffect} from 'react';
import {useLatest} from '../utils/useLatest';

export const MoveBar = ({onMove, onCommit}: {onMove(v: number): void; onCommit(): void}) => {
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
                flexShrink: 0,
            }}
            className={
                'cursor-pointer' + (moving ? ' bg-amber-200' : ' bg-slate-700 hover:bg-amber-200')
            }
        ></div>
    );
};
