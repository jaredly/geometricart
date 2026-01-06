import {useId} from 'react';

export type Breadcrumb = {title: string; href: string; dropdown?: {title: string; href: string}[]};

export const Page = ({
    children,
    breadcrumbs,
}: {
    children: React.ReactNode;
    breadcrumbs: Breadcrumb[];
}) => (
    <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
        <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200 flex justify-between">
            <div className="breadcrumbs text-sm">
                <ul>
                    {breadcrumbs.map((item, i) => (
                        <li key={i}>
                            <HoverDropdown
                                button={
                                    i === breadcrumbs.length - 1 ? (
                                        item.title
                                    ) : (
                                        <a href={item.href}>{item.title}</a>
                                    )
                                }
                                hover={
                                    item.dropdown ? (
                                        <ul>
                                            {item.dropdown.map((sub, i) => (
                                                <li key={i}>
                                                    <a href={sub.href}>{sub.title}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : undefined
                                }
                            />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        {children}
    </div>
);

export const HoverDropdown = ({
    button,
    hover,
}: {
    button: React.ReactNode;
    hover?: React.ReactNode;
}) => {
    const id = useId();
    if (!hover) return button;
    return (
        <>
            <button
                interestfor={`annotation-` + id}
                style={{
                    // @ts-expect-error this is fine
                    anchorName: '--anchor-' + id,
                    interestDelay: '0s',
                }}
            >
                {button}
            </button>
            <div
                popover={'auto'}
                className="dropdown card p-2 bg-base-100 border-base-300 border"
                // @ts-expect-error this is fine
                style={{positionAnchor: '--anchor-' + id}}
                id={`annotation-${id}`}
            >
                {hover}
            </div>
        </>
    );
};
