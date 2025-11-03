import React from 'react';
import {Coord} from '../../../types';
import {Pending, State} from './animator.utils';

export function LinesTable({
    state,
    setHover,
    preview,
    setPending,
    setState,
}: {
    state: State;
    setHover: React.Dispatch<React.SetStateAction<number | null>>;
    preview: number;
    setPending: React.Dispatch<React.SetStateAction<Pending | null>>;
    setState: React.Dispatch<React.SetStateAction<State>>;
}) {
    const total = state.layers.length;
    return (
        <table className="table">
            <tbody>
                {state.lines.map((line, i) => (
                    <tr
                        key={i}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                    >
                        <td>Line #{i + 1}</td>
                        <td>
                            <svg style={{width: 110, height: 20}}>
                                <line
                                    x1={
                                        (Math.min(...line.keyframes.map((k) => k.at)) * 100) /
                                            total +
                                        5
                                    }
                                    x2={
                                        (Math.max(...line.keyframes.map((k) => k.at)) * 100) /
                                            total +
                                        5
                                    }
                                    y1={10}
                                    y2={10}
                                    stroke={'#555'}
                                    strokeWidth={1}
                                />
                                {line.keyframes.map((kf) => (
                                    <circle
                                        cx={(kf.at * 100) / total + 5}
                                        cy={10}
                                        r={5}
                                        fill={kf.at === preview ? 'white' : 'red'}
                                        key={kf.at}
                                    />
                                ))}
                            </svg>
                        </td>
                        <td>
                            <button
                                className="btn"
                                onClick={() => setPending({type: 'line', idx: i, points: []})}
                            >
                                +
                            </button>
                        </td>
                        <td>
                            <button
                                className="btn"
                                onClick={() => {
                                    if (line.keyframes.length === 1) {
                                        setState({
                                            ...state,
                                            lines: state.lines.filter((_, j) => j !== i),
                                        });
                                    } else {
                                        let next = line.keyframes.findIndex((f) => f.at >= preview);
                                        if (next === -1) next = line.keyframes.length - 1;
                                        const lines = state.lines.slice();
                                        lines[i] = {
                                            ...line,
                                            keyframes: line.keyframes.filter((_, k) => k !== next),
                                        };
                                        setState({...state, lines});
                                    }
                                }}
                            >
                                &times;
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
