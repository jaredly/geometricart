import * as React from 'react';

export const Tooltip = ({
    text,
    children,
}: {
    text: string;
    children: React.ReactNode;
}) => {
    const [show, setShow] = React.useState(false);
    return (
        <span
            style={{ position: 'relative' }}
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
