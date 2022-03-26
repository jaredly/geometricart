import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Info } from './Fixtures';

export const ShowValues = ({
    values,
    type,
}: {
    values: Array<any>;
    type: Info['expressions'][0]['type'];
}) => {
    const [index, setIndex] = React.useState(0);
    React.useEffect(() => {
        if (values.length <= 1) {
            return;
        }
        const fn = (evt: KeyboardEvent) => {
            if (evt.key === 'ArrowLeft') {
                evt.preventDefault();
                evt.stopPropagation();
                setIndex((i) => (i > 0 ? i - 1 : values.length - 1));
            }
            if (evt.key === 'ArrowRight') {
                evt.preventDefault();
                evt.stopPropagation();
                setIndex((i) => (i < values.length - 1 ? i + 1 : 0));
            }
        };
        document.addEventListener('keydown', fn);

        return () => document.removeEventListener('keydown', fn);
    }, [values.length]);
    const v = values[index];
    if (typeof v === 'function' && v.meta && v.meta.comment) {
        const arc: Array<{ name: string; comment?: string }> =
            v.meta.argComments;
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
                <ReactMarkdown
                    children={v.meta.comment.replace(/^\s*\*/gm, '')}
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    className="md"
                />
                {arc.some((c) => c && c.comment) ? (
                    <>
                        <h4 style={{ marginTop: '1em', marginBottom: '.5em' }}>
                            Arguments
                        </h4>
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
                                                <ReactMarkdown
                                                    children={arg.comment}
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[
                                                        rehypeKatex,
                                                    ]}
                                                    className="md"
                                                />
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
    return (
        <div style={{ whiteSpace: 'pre' }}>
            {values.length > 1 ? `${1 + index}/${values.length}\n` : ''}
            {type ? type.type : '[No type info]'}
            {'\n'}
            {typeof v === 'function' && v.meta
                ? `function ${v.meta.name}\n${v.meta.comment ?? ''}`
                : typeof v === 'number'
                ? v.toFixed(2)
                : JSON.stringify(
                      v,
                      (k, v) =>
                          typeof v === 'number' ? Math.round(v * 100) / 100 : v,
                      2,
                  )}
        </div>
    );
};
