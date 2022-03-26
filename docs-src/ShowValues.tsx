import * as React from 'react';
import { Info } from './Fixtures';
import { widgets } from './functionWidgets';
import { RenderFunctionDocumentation } from './RenderFunctionDocumentation';

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
            <RenderFunctionDocumentation
                values={values}
                index={index}
                arc={arc}
                v={v}
            />
        );
    }
    return (
        <div style={{ whiteSpace: 'pre' }}>
            {values.length > 1 ? `${1 + index}/${values.length}\n` : ''}
            {type ? type.type : '[No type info]'}
            {'\n'}
            {type && widgets[type.type] ? (
                <div style={{ width: 100, height: 100 }}>
                    {widgets[type.type](v, null, '100px')}
                </div>
            ) : typeof v === 'function' && v.meta ? (
                `function ${v.meta.name}\n${v.meta.comment ?? ''}`
            ) : typeof v === 'number' ? (
                v.toFixed(2)
            ) : (
                JSON.stringify(
                    v,
                    (k, v) =>
                        typeof v === 'number' ? Math.round(v * 100) / 100 : v,
                    2,
                )
            )}
        </div>
    );
};
