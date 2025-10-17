import React from 'react';

export const useCurrent = <T,>(value: T) => {
    const ref = React.useRef(value);
    React.useEffect(() => {
        ref.current = value;
    });
    return ref;
};
