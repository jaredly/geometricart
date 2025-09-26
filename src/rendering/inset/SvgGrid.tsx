import * as React from 'react';

export const SvgGrid = ({size}: {size: number}) => {
    return (
        <>
            <defs>
                <pattern id="smallGrid" width={size} height={size} patternUnits="userSpaceOnUse">
                    <path
                        d={`M ${size} 0 L 0 0 0 ${size}`}
                        fill="none"
                        stroke="gray"
                        strokeWidth="0.5"
                    />
                </pattern>
                <pattern id="grid" width={size * 5} height={size * 5} patternUnits="userSpaceOnUse">
                    <rect width={size * 5} height={size * 5} fill="url(#smallGrid)" />
                    <path
                        d={`M ${size * 5} 0 L 0 0 0 ${size * 5}`}
                        fill="none"
                        stroke="gray"
                        strokeWidth="1"
                    />
                </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#grid)" />
        </>
    );
};
