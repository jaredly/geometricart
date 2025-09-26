import * as React from 'react';

export const Tooltip = ({
    text,
    children,
}: {
    text?: string | null;
    children: React.ReactElement;
}): React.ReactElement => {
    const [show, setShow] = React.useState(false);
    if (!text) {
        return children;
    }
    return (
        <span
            style={{position: 'relative'}}
            onMouseEnter={() => {
                setShow(true);
            }}
            onMouseLeave={() => {
                setShow(false);
            }}
        >
            {children}
            {show ? (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                        fontSize: '0.8em',
                        background: '#333',
                        // border: '1px solid black',
                        padding: '4px',
                        zIndex: 100,
                    }}
                >
                    {text}
                </div>
            ) : null}
        </span>
    );
};
