

export function RenderFunctionDocumentation({
    values,
    index,
    arc,
    v,
}: {
    values: any[];
    index: number;
    arc: {name: string; comment?: string | undefined}[];
    v: any;
}) {
    return (
        <div
            style={{
                padding: 16,
                fontFamily: 'system-ui',
            }}
        >
            {values.length > 1 ? `${1 + index}/${values.length}\n` : ''}
            {arc.some(Boolean) ? (
                <div
                    style={{
                        marginBottom: '1em',
                        padding: '8px 16px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                >
                    <code>
                        {v.meta.name}({arc.map((c) => c.name).join(', ')})
                    </code>
                </div>
            ) : null}
            {/* <ReactMarkdown
                children={v.meta.comment.replace(/^\s*\* /gm, '')}
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                className="md"
            /> */}
            {arc.some((c) => c && c.comment) ? (
                <>
                    <h4 style={{marginTop: '1em', marginBottom: '.5em'}}>Arguments</h4>
                    <table>
                        <tbody>
                            {arc.map((arg) => (
                                <tr>
                                    <td
                                        style={{
                                            paddingRight: 8,
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        {arg.name}
                                    </td>
                                    <td>
                                        {arg.comment ? (
                                            // <ReactMarkdown
                                            //     children={arg.comment}
                                            //     remarkPlugins={[remarkMath]}
                                            //     rehypePlugins={[rehypeKatex]}
                                            //     className="md"
                                            // />
                                            null
                                        ) : (
                                            'No documentation'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            ) : null}
        </div>
    );
}
