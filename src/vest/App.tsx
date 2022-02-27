// The main deals

import equal from 'fast-deep-equal';
import * as React from 'react';
import { render } from 'react-dom';
import { Config } from './types';

export const App = <I, O>({ config }: { config: Config<I, O> }) => {
    // Here we go
    const [fixtures, setFixtures] = React.useState(
        [] as Array<{
            name: string;
            input: I;
            expected: O | null;
            status: 'pass' | 'fail' | 'unknown';
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
                        expected: string | null;
                    }>,
                ) => {
                    setFixtures(
                        fixtures.map((fix) => {
                            const input =
                                config.serde?.input?.deserialize(fix.input) ??
                                JSON.parse(fix.input);
                            const expected = fix.expected
                                ? config.serde?.output?.deserialize(
                                      fix.expected,
                                  ) ?? JSON.parse(fix.expected)
                                : null;
                            const status = expected
                                ? equal(expected, config.transform(input))
                                    ? 'pass'
                                    : 'fail'
                                : 'unknown';
                            return { name: fix.name, input, expected, status };
                        }),
                    );
                },
            );
    }, []);

    const Editor = config.render.editor;
    const Output = config.render.fixture;

    const [current, setCurrent] = useLocalStorage(
        `vest-${config.id}`,
        null as null | I,
    );

    const [name, setName] = React.useState('');

    return (
        <div>
            <div> Fixture: {config.id} </div>
            <Editor initial={current} onChange={setCurrent} />
            <input
                value={name}
                onChange={(evt) => setName(evt.target.value)}
                placeholder="Fixture Name"
            />
            <button
                disabled={current == null}
                onClick={() => {
                    if (!current) {
                        return;
                    }
                    setCurrent(null);
                    setName('');
                    setFixtures(
                        fixtures.concat([
                            {
                                name,
                                input: current,
                                expected: null,
                                status: 'unknown',
                            },
                        ]),
                    );
                }}
            >
                Add fixture
            </button>
            {fixtures.map((f, i) => {
                const output = config.transform(f.input);
                const status = f.expected
                    ? equal(output, f.expected)
                        ? 'pass'
                        : 'fail'
                    : 'unknown';
                return (
                    <div key={i}>
                        <div>{f.name}</div>
                        <Output
                            input={f.input}
                            expected={status === 'fail' ? f.expected : null}
                            output={output}
                        />
                        <div>Status: {status}</div>
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
