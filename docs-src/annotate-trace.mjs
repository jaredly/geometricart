// ok

import traverse from '@babel/traverse';
import babel from '@babel/core';
import t from '@babel/types';

const hasComment = (node) =>
    node.leadingComments &&
    node.leadingComments.some((s) => s.value.includes(' @trace'));

const fns = ['ArrowFunctionExpression', 'FunctionDeclaration'];

const ensureStmt = (n) => (t.isStatement(n) ? n : t.expressionStatement(n));

export default function (contents) {
    const parsed = babel.parseSync(contents, {
        parserOpts: {
            plugins: ['typescript', 'jsx'],
        },
    });

    const found = [];

    parsed.program.body.forEach((node) => {
        if (hasComment(node)) {
            if (node.type === 'ExportNamedDeclaration') {
                node.declaration.declarations.forEach((decl) => {
                    if (fns.includes(decl.init.type)) {
                        decl.id.name += 'Trace';
                        traverse.default(
                            t.file(t.program([ensureStmt(decl.init)])),
                            annotateFunctionBody(decl.init),
                        );
                        found.push(
                            t.exportNamedDeclaration(
                                t.variableDeclaration('const', [decl]),
                            ),
                        );
                    }
                });
            }
            // if (node.type === 'VariableDeclaration') {
            //     // found.push(node);
            //     node.declaration.declarations.forEach((node) => {
            //         if (fns.includes(node.init.type)) {
            //             node.id.name += 'Trace';
            //             traverse.default(
            //                 t.program([ensureStmt(node.init)]),
            //                 annotateFunctionBody(node.init),
            //             );
            //             found.push(
            //                 t.exportNamedDeclaration(
            //                     t.variableDeclaration('const', [node]),
            //                 ),
            //             );
            //         }
            //     });
            // }
        }
    });

    return t.program(found);
}

function annotateFunctionBody(toplevel) {
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
                if (path.node.type.startsWith('TS')) {
                    return;
                }
                if (isTS(path)) return;
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
    };
}

const isTS = (path) => {
    return (
        path.node.type.toLowerCase().startsWith('ts') ||
        (path.parentPath && isTS(path.parentPath))
    );
};
