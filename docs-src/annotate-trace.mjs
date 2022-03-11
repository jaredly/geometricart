// ok

import traverse from '@babel/traverse';
import babel from '@babel/core';
import t from '@babel/types';
import generate from '@babel/generator';

const hasComment = (node) =>
    node.leadingComments &&
    node.leadingComments.some((s) => s.value.includes(' @trace'));

const fns = ['ArrowFunctionExpression', 'FunctionDeclaration'];

const ensureStmt = (n) => (t.isStatement(n) ? n : t.expressionStatement(n));

export const addFunctionMeta = (contents, filePath) => {
    const parsed = babel.parseSync(contents, {
        parserOpts: {
            plugins: ['typescript', 'jsx'],
        },
    });
    const found = [];

    parsed.program.body.forEach((node) => {
        if (node.type === 'ExportNamedDeclaration') {
            if (!node.declaration.declarations) {
                return;
            }
            node.declaration.declarations.forEach((decl) => {
                if (fns.includes(decl.init.type)) {
                    found.push(
                        t.expressionStatement(
                            t.assignmentExpression(
                                '=',
                                t.memberExpression(
                                    t.identifier(decl.id.name),
                                    t.identifier('meta'),
                                ),
                                t.objectExpression([
                                    t.objectProperty(
                                        t.identifier('name'),
                                        t.stringLiteral(decl.id.name),
                                    ),
                                    t.objectProperty(
                                        t.identifier('filePath'),
                                        t.stringLiteral(filePath),
                                    ),
                                ]),
                            ),
                        ),
                    );
                }
            });
        }
    });

    return found;
};

export default function (contents, filePath) {
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
                        const name = decl.id.name;
                        decl.id.name += 'Trace';
                        const traceInfo = {
                            expressions: {},
                            calls: {},
                            references: [],
                        };
                        traverse.default(
                            t.file(t.program([ensureStmt(decl.init)])),
                            annotateFunctionBody(decl.init, traceInfo),
                        );
                        found.push(
                            t.exportNamedDeclaration(
                                t.variableDeclaration('const', [decl]),
                            ),
                        );
                        found.push(
                            t.expressionStatement(
                                t.assignmentExpression(
                                    '=',
                                    t.memberExpression(
                                        t.identifier(decl.id.name),
                                        t.identifier('traceInfo'),
                                    ),
                                    t.identifier(JSON.stringify(traceInfo)),
                                ),
                            ),
                        );
                        // found.push(
                        //     t.expressionStatement(
                        //         t.assignmentExpression(
                        //             t.memberExpression(
                        //                 t.identifier(name),
                        //                 t.identifier('meta'),
                        //             ),
                        //             t.objectExpression([
                        //                 t.objectProperty(
                        //                     t.identifier('name'),
                        //                     t.stringLiteral(name),
                        //                 ),
                        //                 t.objectProperty(
                        //                     t.identifier('filePath'),
                        //                     t.stringLiteral(filePath),
                        //                 ),
                        //             ]),
                        //         ),
                        //     ),
                        // );
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

    found.push(
        t.exportNamedDeclaration(
            t.variableDeclaration('const', [
                t.variableDeclarator(
                    t.identifier('rawSource'),
                    t.stringLiteral(contents),
                ),
            ]),
        ),
    );

    return t.program(found.concat(addFunctionMeta(contents, filePath)));
}

function annotateFunctionBody(toplevel, traceInfo) {
    const seen = new Map();
    let i = 0;

    const assigns = {};

    function captureArguments(path) {
        if (seen.has(path.node)) {
            return;
        }
        seen.set(path.node, -1);
        path.node.params.forEach((param) => {
            if (param.type === 'Identifier') {
                const num = i++;
                traceInfo.expressions[num] = {
                    start: param.start,
                    end: param.end,
                };
                const n = t.callExpression(t.identifier('trace'), [
                    t.identifier(param.name),
                    t.numericLiteral(num),
                    // t.numericLiteral(param.start),
                    // t.numericLiteral(param.end),
                ]);
                seen.set(n, num);
                seen.set(n.callee, -1);
                n.arguments.forEach((arg) => seen.set(arg, -1));
                path.node.body.body.unshift(n);
            }
        });
        path.node.params.push(t.identifier('trace'));
    }

    return {
        VariableDeclarator: {
            exit(path) {
                const at = seen.get(path.node.init);
                assigns[path.node.id.name] = at;
            },
        },
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
                if (isTS(path)) return;
                // if (path.node.type === 'NumericLiteral') return;
                // if (path.node.type === 'StringLiteral') return;
                // if (path.node.type === 'BoolLiteral') return;
                if (seen.has(path.node)) return;

                // TODO: Need to capture the location somewhere,
                // otherwise we don't know where to display it.
                if (
                    path.node.type === 'Identifier' &&
                    assigns[path.node.name] != null
                ) {
                    seen.set(path.node, assigns[path.node.name]);
                    traceInfo.references.push({
                        id: assigns[path.node.name],
                        loc: {
                            start: path.node.start,
                            end: path.node.end,
                        },
                    });
                    return;
                }

                const num = i++;
                traceInfo.expressions[num] = {
                    start: path.node.start,
                    end: path.node.end,
                };
                const n = t.callExpression(t.identifier('trace'), [
                    path.node,
                    t.numericLiteral(num),
                    // t.numericLiteral(path.node.start),
                    // t.numericLiteral(path.node.end),
                ]);
                if (path.node.type === 'CallExpression') {
                    traceInfo.calls[num] = {
                        fn: seen.get(path.node.callee),
                        args: path.node.arguments.map((arg) => seen.get(arg)),
                    };
                    // const arr = [
                    //     t.numericLiteral(seen.get(path.node.callee)),
                    //     ...path.node.arguments.map((arg) =>
                    //         t.numericLiteral(seen.get(arg)),
                    //     ),
                    // ];
                    // n.arguments.push(t.arrayExpression(arr));
                    // arr.forEach((exp) => seen.set(exp, -1));
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
