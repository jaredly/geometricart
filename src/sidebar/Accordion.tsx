import * as React from 'react';
import { cx } from '@emotion/css';
import { Button } from 'primereact/button';

export type Tab = {
    key: string;
    header: React.ReactNode;
    onHover?: (hovered: boolean) => void;
    content: () => React.ReactNode;
};
export type ActiveIds = { [key: string]: boolean };

export const Accordion = ({
    tabs,
    activeIds,
    setActiveIds,
}: {
    tabs: Tab[];
    activeIds: ActiveIds;
    setActiveIds: (ids: ActiveIds) => void;
}) => {
    const cache = React.useMemo(() => ({} as { [key: string]: boolean }), []);
    Object.entries(activeIds).forEach(([key, active]) => {
        if (active) {
            cache[key] = true;
        }
    });
    return (
        <div
            className="p-accordion p-component"
            style={{
                border: '1px solid var(--surface-border)',
                backgroundColor: 'var(--surface-card)',
                borderBottom: 'none',
            }}
        >
            {tabs.map((tab) => (
                <div
                    key={tab.key}
                    className={cx(
                        'p-accordion-header',
                        `p-accordion-tab`,
                        activeIds[tab.key] && 'p-accordion-tab-active',
                    )}
                >
                    <div
                        className="hover py-3 px-2"
                        style={{
                            cursor: 'pointer',
                            '--hover-color': 'rgba(255, 255, 255, 0.1)',
                            borderBottom: '1px solid var(--surface-border)',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        onMouseEnter={
                            tab.onHover ? () => tab.onHover!(true) : undefined
                        }
                        onMouseLeave={
                            tab.onHover ? () => tab.onHover!(false) : undefined
                        }
                        onClick={() =>
                            setActiveIds({
                                ...activeIds,
                                [tab.key]: !activeIds[tab.key],
                            })
                        }
                    >
                        <Button
                            className="p-button-sm p-button-rounded p-button-text mr-2"
                            icon={`p-accordion-toggle-icon pi pi-chevron-${
                                activeIds[tab.key] ? 'down' : 'right'
                            }`}
                            style={{
                                marginTop: -10,
                                marginBottom: -12,
                            }}
                            onClick={(evt) => {
                                evt.stopPropagation();
                                setActiveIds({
                                    ...activeIds,
                                    [tab.key]: !activeIds[tab.key],
                                });
                            }}
                        />
                        {tab.header}
                    </div>
                    {activeIds[tab.key] || cache[tab.key] ? (
                        <div
                            style={{
                                borderBottom: '1px solid var(--surface-border)',
                                display: activeIds[tab.key] ? 'block' : 'none',
                            }}
                        >
                            {tab.content()}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
};
