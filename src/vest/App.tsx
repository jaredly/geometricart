// The main deals

import equal from 'fast-deep-equal';
import * as React from 'react';
import { render } from 'react-dom';
import { Config, Fixture } from './types';
import { deserializeFixture, serializeFixture } from './utils';

const initial: Array<unknown> = [];

export const App = <I, O>({ config }: { config: Config<I, O> }) => {
    // Here we go
    const [fixtures, setFixtures] = React.useState(
        initial as Array<Fixture<I, O>>,
    );

    React.useEffect(() => {
        fetch(`?${config.id}`)
            .then((res) => res.json())
            .then((fixtures: Array<string>) => {
                setFixtures(
                    fixtures.map((fix) => deserializeFixture(fix, config)),
                );
            });
    }, []);

    React.useEffect(() => {
        if (fixtures === initial) {
            return;
        }
        fetch(`?${config.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                fixtures.map((fixture) => ({
                    name: fixture.name,
                    raw: serializeFixture(fixture, config.serde),
                })),
            ),
        }).then((res) => {
            if (res.status !== 204) {
                console.error(
                    `Unexpected status ${res.status} when saving fixtures.`,
                );
            }
        });
    }, [fixtures]);

    const Editor = config.render.editor;
    const Output = config.render.fixture;

    const [current, setCurrent] = useLocalStorage(
        `vest-${config.id}`,
        null as null | I,
    );

    const [name, setName] = React.useState('');

    const [passing, setPassing] = React.useState(false);

    const updateFixture = (
        i: number,
        f: (f: Fixture<I, O>) => Fixture<I, O>,
    ) => {
        setFixtures((fs) => {
            fs = fs.slice();
            fs[i] = f(fs[i]);
            return fs;
        });
    };

    const fixturesWithOutputs = fixtures.map((f) => {
        const output = config.transform(f.input);
        return {
            fixture: f,
            output,
            isEqual: equal(output, f.output),
        };
    });

    return (
        <div>
            <div>Fixture: {config.id}</div>
            <div style={{ margin: 8, padding: 8, border: '1px solid white' }}>
                <Editor initial={current} onChange={setCurrent} />
            </div>
            <input
                value={name}
                onChange={(evt) => setName(evt.target.value)}
                placeholder="Fixture Name"
            />
            <div>
                <button onClick={() => setPassing(true)} disabled={passing}>
                    Pass
                </button>
                <button onClick={() => setPassing(false)} disabled={!passing}>
                    Fail
                </button>
            </div>
            <button
                disabled={current == null}
                onClick={() => {
                    if (!current) {
                        return;
                    }
                    setCurrent(null);
                    setName('');
                    setPassing(false);
                    setFixtures(
                        fixtures.concat([
                            {
                                name,
                                input: current,
                                output: config.transform(current),
                                isPassing: passing,
                            },
                        ]),
                    );
                }}
            >
                Add fixture
            </button>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                }}
            >
                {fixturesWithOutputs
                    .sort((a, b) => {
                        if (a.isEqual === b.isEqual) {
                            return +a.fixture.isPassing - +b.fixture.isPassing;
                        }
                        return +a.isEqual - +b.isEqual;
                    })
                    .map(({ fixture, isEqual, output }, i) => {
                        // const output = config.transform(f.input);
                        // const isEqual = equal(output, f.output);
                        const color = isEqual
                            ? fixture.isPassing
                                ? 'green'
                                : 'red'
                            : 'orange';
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: 16,
                                    margin: 8,
                                    boxShadow: '0 0 5px white',
                                    borderRadius: 4,
                                    border: `6px solid ${color}`,
                                }}
                            >
                                <div>{fixture.name}</div>
                                <Output
                                    input={fixture.input}
                                    previous={{
                                        output: isEqual ? null : output,
                                        isPassing: fixture.isPassing,
                                    }}
                                    output={output}
                                />
                                <div>
                                    <button
                                        onClick={() =>
                                            updateFixture(i, (f) => ({
                                                ...f,
                                                output,
                                                isPassing: true,
                                            }))
                                        }
                                        disabled={isEqual && fixture.isPassing}
                                    >
                                        Pass
                                    </button>
                                    <button
                                        onClick={() =>
                                            updateFixture(i, (f) => ({
                                                ...f,
                                                output,
                                                isPassing: false,
                                            }))
                                        }
                                        disabled={isEqual && !fixture.isPassing}
                                    >
                                        Fail
                                    </button>
                                    {!isEqual ? 'Different!' : null}
                                    Status: {fixture.isPassing + ''}{' '}
                                    {isEqual + ''}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export const useLocalStorage = <T,>(
    key: string,
    initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = React.useState((): T => {
        const data = localStorage[key];
        if (data) {
            return JSON.parse(data);
        }
        return initial;
    });
    React.useEffect(() => {
        if (value !== initial) {
            localStorage[key] = JSON.stringify(value);
        }
    }, [value]);
    return [value, setValue];
};

export const run = (config: Config<unknown, unknown>) => {
    render(<App config={config} />, document.getElementById('root'));
};
