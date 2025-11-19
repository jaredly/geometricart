import {Coord} from '../../../types';

export type IGuide = {type: 'line' | 'circle'; p1: Coord; p2: Coord; selected?: number};
export function AddMark({
    pending,
    setPending,
}: {
    pending: {type: IGuide['type']; points: Coord[]} | null;
    setPending: (value: {type: IGuide['type']; points: Coord[]} | null) => void;
}) {
    return (
        <div>
            {pending ? (
                <button
                    className="text-base m-2 p-1 px-3 rounded cursor-pointer hover:bg-base-300"
                    onClick={() => setPending(null)}
                >
                    Adding {pending.type + ' '}
                    &times;
                </button>
            ) : (
                <ul className="menu menu-horizontal rounded-box">
                    <li>
                        <details
                            onClick={(evt) => {
                                evt.currentTarget.open = !evt.currentTarget.open;
                            }}
                        >
                            <summary className="p-2" onClick={(evt) => evt.stopPropagation()}>
                                New
                            </summary>
                            <ul className="shadow-md shadow-base-300 z-10">
                                <li>
                                    <button onClick={() => setPending({type: 'line', points: []})}>
                                        Line
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => setPending({type: 'circle', points: []})}
                                    >
                                        Circle
                                    </button>
                                </li>
                            </ul>
                        </details>
                    </li>
                </ul>
            )}
        </div>
    );
}
