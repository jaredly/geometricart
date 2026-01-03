export const Page = ({
    children,
    breadcrumbs,
}: {
    children: React.ReactNode;
    breadcrumbs: {title: string; href: string}[];
}) => (
    <div className="mx-auto w-6xl p-4 pt-0 bg-base-200 shadow-base-300 shadow-md">
        <div className="sticky top-0 py-2 mb-2 bg-base-200 shadow-md shadow-base-200 flex justify-between">
            <div className="breadcrumbs text-sm">
                <ul>
                    {breadcrumbs.map((item, i) => (
                        <li key={i}>
                            {i === breadcrumbs.length - 1 ? (
                                item.title
                            ) : (
                                <a href={item.href}>{item.title}</a>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        {children}
    </div>
);
