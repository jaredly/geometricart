import * as React from 'react';

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
