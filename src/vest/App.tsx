// The main deals

import equal from 'fast-deep-equal';
import * as React from 'react';
import { render } from 'react-dom';
import { Config } from './types';
import { parseOutput } from './vest';

export const App = <I, O>({ config }: { config: Config<I, O> }) => {
    // Here we go
    const [fixtures, setFixtures] = React.useState(
        [] as Array<{
            name: string;
            input: I;
            output: O;
            isPassing: boolean;
        }>,
    );

    React.useEffect(() => {
        fetch(`?${config.id}`)
            .then((res) => res.json())
            .then(
                (
                    fixtures: Array<{
                        name: string;
                        input: string;
                        output: string;
                    }>,
                ) => {
                    setFixtures(
                        fixtures.map((fix) => {
                            const input =
                                config.serde?.input?.deserialize(fix.input) ??
                                JSON.parse(fix.input);
                            const [outputRaw, isPassing] = parseOutput(
                                fix.output,
                            );
                            const output =
                                config.serde?.output?.deserialize(outputRaw) ??
                                JSON.parse(outputRaw);
                            return { name: fix.name, input, output, isPassing };
                        }),
                    );
                },
            );
    }, []);

    React.useEffect(() => {
        fetch(`?${config.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                fixtures.map((fixture) => {
                    const input =
                        config.serde?.input?.serialize(fixture.input) ??
                        JSON.stringify(fixture.input);
                    const output =
                        config.serde?.output?.serialize(fixture.output) ??
                        JSON.stringify(fixture.output);
                    return {
                        name: fixture.name,
                        input,
                        output:
                            (fixture.isPassing ? 'pass\n' : 'fail\n') + output,
                    };
                }),
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

    return (
        <div>
            <div> Fixture: {config.id} </div>
            <Editor initial={current} onChange={setCurrent} />
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
            {fixtures.map((f, i) => {
                const output = config.transform(f.input);
                const isEqual = equal(output, f.output);
                return (
                    <div key={i}>
                        <div>{f.name}</div>
                        <Output
                            input={f.input}
                            previous={{
                                output: isEqual ? null : output,
                                isPassing: f.isPassing,
                            }}
                            output={output}
                        />
                        <div>
                            Status: {f.isPassing + ''} {isEqual + ''}
                        </div>
                    </div>
                );
            })}
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
