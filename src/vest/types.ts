// Types for vest

import React from 'react';

export type Config<Input, Output> = {
    id: string;
    dir: string;
    transform: (input: Input) => Output;
    /**
     * If you don't want just JSON parse / stringify,
     * You can specify serdes here.
     */
    serde?: {
        input?: {
            serialize: (output: Input) => string;
            deserialize: (raw: string) => Input;
        };
        output?: {
            serialize: (output: Output) => string;
            deserialize: (raw: string) => Output;
        };
    };
    // If you want a custom equality checker, instead of deepEqual
    equal?: (current: Output, candidate: Output) => boolean;
    /**
     * UI Configuration!
     */
    render: {
        input: (props: {
            initial: Input | null;
            onChange: (changed: Input) => void;
        }) => React.ReactNode;
        // TODO: Should I include some linters/validators?
        // Could be cool. But I don't need to right now.
        // Ok I do want a way to store notes about
        // a given output. Like, should we hang on to
        // what the failing condition looks like?
        // Should we be able to "expect failure"?
        // Maybe?
        // I'll wait on that.
        // should notes go on the "input" or the "output"?
        // input I think. and that's where skipness would live too.
        output: (props: { input: Input; output: Output }) => React.ReactNode;
    };
};
