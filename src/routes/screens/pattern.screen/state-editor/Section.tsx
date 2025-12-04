import React from 'react';

export const Section = ({
    title,
    children,
    actions,
    alignStart,
    open: openV,
    onOpen,
}: {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    alignStart?: boolean;
    open?: boolean;
    onOpen?: (open: boolean) => void;
}) => {
    return (
        <details open={openV}>
            <summary
                className="text-xl cursor-pointer hover:underline hover:text-accent"
                onClick={
                    onOpen
                        ? (evt) => {
                              evt.preventDefault();
                              onOpen(!openV);
                          }
                        : undefined
                }
            >
                {title}
                <div
                    className={`inline-flex ml-4 gap-3 ${alignStart ? 'items-start' : 'items-center'} justify-between`}
                >
                    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
                </div>
            </summary>
            <div className="bg-base-100 shadow-md">
                <div className="space-y-4">{children}</div>
            </div>
        </details>
    );
};
