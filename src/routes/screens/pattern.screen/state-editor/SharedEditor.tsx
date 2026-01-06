import {useMemo} from 'react';
import {AnimatableValue} from '../export-types';
import {BlurInput} from './BlurInput';
import {cmp} from './cmp';
import {nextKey} from './PatternEditor';
import {processScript} from '../eval/process-script';
import {GraphUp} from '../../../../icons/Icon';
import {Coord} from '../../../../types';
import {shapeD} from '../../../shapeD';
import {AnimCtx, getScript} from '../eval/evaluate';
import {globals} from '../eval/eval-globals';

export const SharedEditor = ({
    shared,
    onChange,
}: {
    shared?: Record<string, AnimatableValue>;
    onChange(v: Record<string, AnimatableValue>): void;
}) => {
    const usesT = useMemo(
        () =>
            shared
                ? Object.keys(shared).filter((k) => {
                      try {
                          const {undeclared, arg, needsReturn} = processScript(shared[k]);
                          return undeclared.includes('t');
                      } catch (err) {
                          return false;
                      }
                  })
                : [],
        [shared],
    );

    return (
        <details className="space-y-4 p-4 border border-base-300 bg-base-100">
            <summary className="font-semibold text-sm gap-4 items-center">Shared Values</summary>

            <div className="border border-base-300 rounded-md p-4 space-y-4">
                <button
                    onClick={() => {
                        const nk = nextKey(shared ?? {});
                        if (!nk) return;
                        onChange({...shared, [nk]: '1 + 1'});
                    }}
                    className="btn btn-sm"
                >
                    Add shared value
                </button>
                {Object.entries(shared ?? {})
                    .sort((a, b) => cmp(a[0], b[0]))
                    .map(([key, value]) => (
                        <div key={key} className="flex flex-row">
                            <BlurInput
                                className="w-10 font-mono"
                                value={key}
                                placeholder="key"
                                onChange={(nkey) => {
                                    if (key === nkey || !nkey) return;
                                    const next = {...shared};
                                    delete next[key];
                                    next[nkey] = value;
                                    onChange(next);
                                }}
                            />
                            <BlurInput
                                className="flex-1 font-mono"
                                style={{fontSize: '.6rem'}}
                                value={value}
                                onChange={(value) => onChange({...shared, [key]: value})}
                                placeholder="value"
                            />
                            {usesT.includes(key) ? (
                                <>
                                    <button
                                        popoverTarget={`popover-${key}`}
                                        style={{
                                            // @ts-ignore
                                            anchorName: `--anchor-${key}`,
                                        }}
                                        className="btn btn-square"
                                    >
                                        <GraphUp />
                                    </button>
                                    <div
                                        popover={'auto'}
                                        className="dropdown dropdown-end menu shadow-sm border border-base-300 rounded-box bg-base-100"
                                        id={`popover-${key}`}
                                        // @ts-ignore
                                        style={{positionAnchor: `--anchor-${key}`}}
                                    >
                                        <TimePreview s={value} />
                                    </div>
                                </>
                            ) : null}
                            <button
                                className="btn btn-sm btn-square"
                                onClick={() => {
                                    const next = {...shared};
                                    delete next[key];
                                    onChange(next);
                                }}
                            >
                                &times;
                            </button>
                        </div>
                    ))}
            </div>
        </details>
    );
};

const TimePreview = ({s}: {s: string}) => {
    const f = useMemo(() => {
        const ctx: AnimCtx = {values: {...globals}, cache: new Map(), warn() {}, palette: []};
        const sc = getScript(ctx, s);
        return sc ? (t: number) => sc.fn({...ctx.values, t}) : null;
    }, [s]);
    const m = 20;
    const w = 200;
    const h = 30;
    // const w = ts.length * m;
    // const h = lane.ys.length * m;
    const items = useMemo(() => {
        if (!f) return 'get script failed';
        const items: React.ReactNode[] = [];

        const zero = f(0);
        if (typeof zero === 'number') {
            const pts: Coord[] = [];
            for (let t = 0; t <= 1; t += 0.001) {
                try {
                    pts.push({x: t, y: f(t)});
                } catch (err) {
                    return err + '';
                }
            }
            const min = pts.reduce((a, b) => Math.min(a, b.y), Infinity);
            const max = pts.reduce((a, b) => Math.max(a, b.y), -Infinity);
            const moved = pts.map(({x, y}) => ({
                x: m + x * w,
                y: m + (1 - (y - min) / (max - min)) * h,
            }));
            items.push(
                <path
                    key="time-preview"
                    d={shapeD(moved, false)}
                    stroke="white"
                    strokeWidth={1}
                    fill="none"
                />,
            );
        } else if (Array.isArray(zero) && zero.length && zero.every((n) => typeof n === 'number')) {
            const manypts: Coord[][] = zero.map(() => []);
            for (let t = 0; t <= 1; t += 0.001) {
                try {
                    (f(t) as number[]).forEach((y, j) => {
                        manypts[j].push({x: t, y});
                    });
                } catch (err) {
                    return err + '';
                }
            }

            zero.forEach((_, j) => {
                const pts = manypts[j];
                const min = pts.reduce((a, b) => Math.min(a, b.y), Infinity);
                const max = pts.reduce((a, b) => Math.max(a, b.y), -Infinity);
                const moved = pts.map(({x, y}) => ({
                    x: m + x * w,
                    y: m + (1 - (y - min) / (max - min)) * h,
                }));
                items.push(
                    <path
                        key="time-preview"
                        d={shapeD(moved, false)}
                        stroke="white"
                        strokeWidth={1}
                        fill="none"
                    />,
                );
            });
        }

        return items;
    }, [f]);
    if (typeof items === 'string') return <div>Failed to evaluate fn: {items}</div>;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{background: 'black', width: w + m * 2, height: h + m * 2}}
        >
            {items}
        </svg>
    );
};
