// ok

import traverse from '@babel/traverse';

const hasComment = (path) =>
    path.node.leadingComments.some((s) => s.value.includes(' @trace'));

export default function (babel) {
    const { types: t } = babel;
    const seen = new Map();
    let i = 0;

    return {
        visitor: {
            ExportNamedDeclaration(path) {
                if (hasComment(path)) {
                    traverse(
                        path.node.declaration,
                        annotateFunctionBody(path.node.declaration, babel),
                    );
                }
            },
        },
    };
}

function annotateFunctionBody(toplevel, babel) {
    const { types: t } = babel;
    const seen = new Map();
    let i = 0;

    function captureArguments(path) {
        path.node.params.forEach((param) => {
            if (param.type === 'Identifier') {
                const num = i++;
                const n = t.callExpression(t.identifier('trace'), [
                    t.identifier(param.name),
                    t.numericLiteral(num),
                    t.numericLiteral(param.start),
                    t.numericLiteral(param.end),
                ]);
                seen.set(n, num);
                seen.set(n.callee, -1);
                n.arguments.forEach((arg) => seen.set(arg, -1));
                path.node.body.body.unshift(n);
            }
        });
    }

    return {
        visitor: {
            ArrowFunctionExpression(path) {
                if (
                    path.node === toplevel &&
                    path.node.body.type === 'BlockStatement'
                ) {
                    captureArguments(path);
                }
            },
            FunctionDeclaration(path) {
                if (path.node === toplevel) {
                    captureArguments(path);
                }
            },
            Expression: {
                exit(path) {
                    if (seen.has(path.node)) return;
                    const num = i++;
                    const n = t.callExpression(t.identifier('trace'), [
                        path.node,
                        t.numericLiteral(num),
                        t.numericLiteral(path.node.start),
                        t.numericLiteral(path.node.end),
                    ]);
                    if (path.node.type === 'CallExpression') {
                        const arr = [
                            t.numericLiteral(seen.get(path.node.callee)),
                            ...path.node.arguments.map((arg) =>
                                t.numericLiteral(seen.get(arg)),
                            ),
                        ];
                        n.arguments.push(t.arrayExpression(arr));
                        arr.forEach((exp) => seen.set(exp, -1));
                    }
                    seen.set(n, num);
                    seen.set(n.callee, -1);
                    seen.set(path.node, num);
                    n.arguments.forEach((arg) => {
                        if (!seen.has(arg)) seen.set(arg, -1);
                    });
                    path.replaceWith(n);
                },
            },
        },
    };
}
