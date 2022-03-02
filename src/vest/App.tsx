// The main deals

import equal from 'fast-deep-equal';
import * as React from 'react';
import { render } from 'react-dom';
import { hoverBackground } from './styles.css';
import { Config, Fixture } from './types';
import {
    deserializeFixture,
    deserializeFixtures,
    serializeFixture,
    serializeFixtures,
} from './utils';
// import ReactJson from 'react-json-view';

const initial: Array<unknown> = [];

const slugify = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-');

export const Sidebar = () => {
    const [vests, setVests] = React.useState([]);
    React.useEffect(() => {
        fetch(`/vests`)
            .then((r) => r.json())
            .then(setVests);
    }, []);

    return (
        <div
            style={{
                width: 300,
            }}
        >
            {vests.map((id) => (
                <a
                    className={hoverBackground}
                    style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: 'white',
                        padding: '4px 8px',
                        backgroundColor:
                            '/' + id === location.pathname
                                ? '#555'
                                : 'transparent',
                    }}
                    href={`/${id}`}
                    key={id}
                >
                    {id}
                </a>
            ))}
        </div>
    );
};

export const App = <I, O>({ config }: { config: Config<I, O> }) => {
    // Here we go
    const [fixtures, setFixtures] = React.useState(
        initial as Array<Fixture<I, O>>,
    );

    React.useEffect(() => {
        fetch(`?${config.id}`)
            .then((res) => res.text())
            .then((raw: string) => {
                setFixtures(deserializeFixtures(raw, config.serde));
            });
    }, []);

    React.useEffect(() => {
        if (fixtures === initial) {
            return;
        }
        fetch(`?${config.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: serializeFixtures(fixtures, config.serde),
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

    const [passing, setPassing] = React.useState(null as null | boolean);

    const updateFixture = (
        name: string,
        f: (f: Fixture<I, O>) => Fixture<I, O>,
    ) => {
        setFixtures((fs) => fs.map((fx) => (fx.name === name ? f(fx) : fx)));
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
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div style={{ flex: 1 }}>
                <div>Fixture: {config.id}</div>
                <div
                    style={{ margin: 8, padding: 8, border: '1px solid white' }}
                >
                    <Editor initial={current} onChange={setCurrent} />
                </div>
                <input
                    style={{ marginLeft: 8, padding: 4 }}
                    value={name}
                    onChange={(evt) => setName(evt.target.value)}
                    placeholder="Fixture Name"
                />
                <div
                    style={{
                        display: 'inline-block',
                        margin: '0 8px',
                        border: `4px solid ${
                            passing === null
                                ? 'orange'
                                : passing
                                ? 'green'
                                : 'red'
                        }`,
                    }}
                >
                    <button
                        onClick={() => setPassing(true)}
                        disabled={passing === true}
                    >
                        Pass
                    </button>
                    <button
                        onClick={() => setPassing(false)}
                        disabled={passing === false}
                    >
                        Fail
                    </button>
                </div>
                <button
                    disabled={
                        current == null ||
                        passing == null ||
                        name === '' ||
                        fixtures.some((f) => slugify(f.name) === slugify(name))
                    }
                    onClick={() => {
                        if (!current) {
                            return;
                        }
                        setCurrent(null);
                        setName('');
                        setPassing(null);
                        setFixtures(
                            fixtures.concat([
                                {
                                    name,
                                    input: current,
                                    output: config.transform(current),
                                    isPassing: !!passing,
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
                                return (
                                    +a.fixture.isPassing - +b.fixture.isPassing
                                );
                            }
                            return +a.isEqual - +b.isEqual;
                        })
                        .map(({ fixture, isEqual, output }, i) => {
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
                                    <div
                                        style={{
                                            display: 'inline-block',
                                            margin: '0 8px',
                                            border: `4px solid ${
                                                fixture.isPassing === null
                                                    ? 'orange'
                                                    : fixture.isPassing
                                                    ? 'green'
                                                    : 'red'
                                            }`,
                                        }}
                                    >
                                        <button
                                            onClick={() =>
                                                updateFixture(
                                                    fixture.name,
                                                    (f) => ({
                                                        ...f,
                                                        output,
                                                        isPassing: true,
                                                    }),
                                                )
                                            }
                                            disabled={
                                                isEqual && fixture.isPassing
                                            }
                                        >
                                            Pass
                                        </button>
                                        <button
                                            onClick={() =>
                                                updateFixture(
                                                    fixture.name,
                                                    (f) => ({
                                                        ...f,
                                                        output,
                                                        isPassing: false,
                                                    }),
                                                )
                                            }
                                            disabled={
                                                isEqual && !fixture.isPassing
                                            }
                                        >
                                            Fail
                                        </button>
                                    </div>
                                    <MaybeShowJson
                                        input={fixture.input}
                                        output={fixture.output}
                                    />
                                    {!isEqual ? 'Different!' : null}
                                    Status: {fixture.isPassing + ''}{' '}
                                    {isEqual + ''}
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

const makeLoader = <T,>(fn: () => Promise<T>) => {
    let promise: null | Promise<T>;
    return () => {
        const [v, setV] = React.useState(null as null | T);
        React.useEffect(() => {
            if (!promise) {
                promise = fn();
            }
            promise.then((m) => {
                setV(() => m);
            });
        }, []);
        return v;
    };
};

const useReactJson = makeLoader(() =>
    import('react-json-view').then((v) => v.default),
);

const MaybeShowJson = ({ input, output }: { input: any; output: any }) => {
    const [show, setShow] = React.useState(false);
    const ReactJson = useReactJson();
    return (
        <div>
            <button onClick={() => setShow(!show)}>Toggle JSON view</button>
            <div style={{ backgroundColor: 'white' }}>
                {show && ReactJson ? (
                    <ReactJson src={{ input, output }} collapsed={true} />
                ) : null}
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
