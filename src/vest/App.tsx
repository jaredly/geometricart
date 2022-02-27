// The main deals

import * as React from 'react';
import { render } from 'react-dom';
import { Config } from './types';

export const App = <I, O>({ config }: { config: Config<I, O> }) => {
    // Here we go
    const [fixtures, setFixtures] = React.useState(
        [] as Array<{ input: I; expected: O | null }>,
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
                            return { input, expected };
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

    return (
        <div>
            <div> Fixture: {config.id} </div>
            <Editor initial={current} onChange={setCurrent} />
            {fixtures.map((f, i) =>
                f.expected ? (
                    <Output key={i} input={f.input} output={f.expected} />
                ) : null,
            )}
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
