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

const listExamplesComment = `// @list-examples\n`;
const listExamplesSigil = `LIST_`.padEnd(listExamplesComment.length - 2, 'x'); //  + ';\n';

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
                    let comment;
                    let argComments = [];
                    if (node.leadingComments?.length) {
                        const last =
                            node.leadingComments[
                                node.leadingComments.length - 1
                            ];
                        if (last.type === 'CommentBlock') {
                            comment = last.value;
                        }
                    }
                    decl.init.params.forEach((param) => {
                        if (
                            param.type === 'Identifier' &&
                            param.loc.start.line > decl.loc.start.line
                        ) {
                            const prev = parsed.comments?.find(
                                (comment) =>
                                    comment.loc.end.line ===
                                    param.loc.start.line - 1,
                            )?.value;
                            argComments.push({
                                name: param.name,
                                comment: prev,
                            });
                        } else if (param.type === 'Identifier') {
                            argComments.push({
                                name: param.name,
                                comment: null,
                            });
                        } else {
                            argComments.push(null);
                        }
                    });

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
                                    t.objectProperty(
                                        t.identifier('comment'),
                                        comment
                                            ? t.stringLiteral(comment)
                                            : t.nullLiteral(),
                                    ),
                                    t.objectProperty(
                                        t.identifier('argComments'),
                                        t.identifier(
                                            JSON.stringify(argComments),
                                        ),
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

export default function (contents, filePath, typesInfo) {
    contents = contents.replace(
        new RegExp(listExamplesComment, 'g'),
        listExamplesSigil + ';\n',
    );
    contents = contents.replace(new RegExp('// @show\\(', 'g'), '____SHOW(');
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
                        const traceInfo = {
                            expressions: {},
                            calls: {},
                            references: [],
                            examples: {},
                            shows: [],
                            comments: parsed.comments
                                .filter(
                                    (comment) =>
                                        comment.type === 'CommentBlock' &&
                                        comment.value.startsWith('*') &&
                                        comment.start > decl.start &&
                                        comment.end < decl.end,
                                )
                                .map((c) => ({
                                    value: c.value,
                                    start: c.start,
                                    end: c.end,
                                })),
                            docs: node.leadingComments
                                .reverse()
                                .find(
                                    (x) =>
                                        x.type === 'CommentBlock' &&
                                        x.value.startsWith('*'),
                                )?.value,
                            start: node.start,
                            end: node.end,
                        };
                        traverse.default(
                            t.file(t.program([ensureStmt(decl.init)])),
                            annotateFunctionBody(
                                decl.init,
                                traceInfo,
                                typesInfo,
                            ),
                        );
                        found.push(
                            t.expressionStatement(
                                t.assignmentExpression(
                                    '=',
                                    t.memberExpression(
                                        t.identifier(decl.id.name),
                                        t.identifier('trace'),
                                    ),
                                    decl.init,
                                ),
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
                        found.push(
                            t.expressionStatement(
                                t.assignmentExpression(
                                    '=',
                                    t.memberExpression(
                                        t.identifier(decl.id.name),
                                        t.identifier('rawSource'),
                                    ),
                                    t.stringLiteral(contents),
                                ),
                            ),
                        );
                    }
                });
            }
        }
    });

    return t.program(found.concat(addFunctionMeta(contents, filePath)));
}

function annotateFunctionBody(toplevel, traceInfo, typesInfo) {
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
                // not using .end to avoid type annotation
                const end = param.start + param.name.length;
                traceInfo.expressions[num] = {
                    start: param.start,
                    end: end,
                    type: typesInfo[param.start + ':' + end],
                };
                const n = t.callExpression(t.identifier('trace'), [
                    t.identifier(param.name),
                    t.numericLiteral(num),
                ]);
                seen.set(n, num);
                seen.set(n.callee, -1);
                n.arguments.forEach((arg) => seen.set(arg, -1));
                if (path.node.body.type !== 'BlockStatement') {
                    path.node.body = t.blockStatement([
                        t.returnStatement(path.node.body),
                    ]);
                }
                path.node.body.body.unshift(n);
                assigns[param.name] = num;
            }
        });
        if (path.node === toplevel) {
            path.node.params.unshift(t.identifier('trace'));
        }
    }

    return {
        VariableDeclarator: {
            exit(path) {
                if (!seen.has(path.node.init)) {
                    return;
                }
                const at = seen.get(path.node.init);
                if (path.node.id.type !== 'Identifier') {
                    // TODO handle better?
                    return;
                }
                assigns[path.node.id.name] = at;
                seen.set(path.node.id, at);
                // not using .end here because that might include a
                // type annotation.
                const end = path.node.id.start + path.node.id.name.length;
                const t = typesInfo[path.node.id.start + ':' + end];
                if (t) {
                    traceInfo.expressions[at].type = t;
                }
                traceInfo.references.push({
                    id: at,
                    loc: {
                        start: path.node.id.start,
                        end: end,
                    },
                });
            },
        },
        ForOfStatement: {
            // enter(path) {
            // }
            enter(path) {
                const id = path.node.left.declarations[0].id;
                if (id.type !== 'Identifier') {
                    // TODO maybe support
                    console.log('not id');
                    return;
                }

                const num = i++;
                assigns[id.name] = num;
                const n = t.callExpression(t.identifier('trace'), [
                    t.identifier(id.name),
                    t.numericLiteral(num),
                ]);
                traceInfo.expressions[num] = {
                    start: id.start,
                    end: id.end,
                    type: typesInfo[id.start + ':' + id.end],
                };
                console.log(id.start, id.end, num);
                seen.set(n, num);
                seen.set(n.callee, -1);
                n.arguments.forEach((arg) => seen.set(arg, -1));

                path.node.body.body.unshift(t.expressionStatement(n));
            },
        },
        // CallExpression(path) {
        //     if (
        //         path.node.callee.type === 'Identifier' &&
        //         path.node.callee.name === '____SHOW'
        //     ) {
        //         path.replaceWith(
        //             t.callExpression(t.identifier('trace'), [
        //                 t.nullLiteral(),
        //                 t.numericLiteral(10),
        //             ]),
        //         );
        //     }
        // },
        ExpressionStatement(path) {
            if (path.node.expression.type === 'CallExpression') {
                const callee = path.node.expression.callee;
                if (
                    callee.type === 'Identifier' &&
                    callee.name === '____SHOW'
                ) {
                    const items = [];
                    traceInfo.shows.push({
                        items,
                        start: path.node.start,
                        end: path.node.end,
                    });
                    path.replaceWith(
                        t.blockStatement(
                            path.node.expression.arguments.map((arg) => {
                                const num = i++;
                                const n = t.callExpression(
                                    t.identifier('trace'),
                                    [arg, t.numericLiteral(num)],
                                );
                                items.push(num);
                                const argNum = assigns[arg.name];
                                traceInfo.expressions[num] = {
                                    start: arg.start,
                                    end: arg.end,
                                    type:
                                        argNum != null
                                            ? traceInfo.expressions[argNum]
                                                  ?.type
                                            : null,
                                };
                                seen.set(n, num);
                                seen.set(n.callee, -1);
                                n.arguments.forEach((arg) =>
                                    seen.has(arg) ? null : seen.set(arg, -1),
                                );
                                return t.expressionStatement(n);
                            }),
                        ),
                    );
                    return;
                    // t.expressionStatement(n));
                }
            }
            if (
                path.node.expression.type === 'Identifier' &&
                path.node.expression.name === listExamplesSigil
            ) {
                const num = i++;
                const n = t.callExpression(t.identifier('trace'), [
                    t.nullLiteral(),
                    t.numericLiteral(num),
                ]);
                traceInfo.expressions[num] = traceInfo.examples[num] = {
                    start: path.node.start,
                    end: path.node.end,
                    type: typesInfo[path.node.start + ':' + path.node.end],
                };
                seen.set(n, num);
                seen.set(n.callee, -1);
                n.arguments.forEach((arg) => seen.set(arg, -1));
                path.replaceWith(t.expressionStatement(n));
            }
        },
        ArrowFunctionExpression(path) {
            // if (
            //     path.node === toplevel &&
            //     path.node.body.type === 'BlockStatement'
            // ) {
            captureArguments(path);
            // }
        },
        FunctionDeclaration(path) {
            // if (path.node === toplevel) {
            captureArguments(path);
            // }
        },
        Expression: {
            exit(path) {
                if (isTS(path) || isLval(path)) return;
                // if (path.node.type === 'NumericLiteral') return;
                // if (path.node.type === 'StringLiteral') return;
                // if (path.node.type === 'BoolLiteral') return;
                if (seen.has(path.node)) return;
                if (
                    path.node.type === 'Identifier' &&
                    path.node.name === '____SHOW'
                ) {
                    return;
                }
                // Ignore forEach folks
                if (
                    path.node.type === 'MemberExpression' &&
                    path.node.property.type === 'Identifier' &&
                    [
                        'forEach',
                        'push',
                        'sort',
                        'splice',
                        'map',
                        'flat',
                        'filter',
                    ].includes(path.node.property.name)
                ) {
                    seen.set(path.node, -1);
                    return;
                }

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
                    type: typesInfo[path.node.start + ':' + path.node.end],
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

const isLval = (path) => {
    return (
        (path.parent.type === 'AssignmentExpression' &&
            path.parentKey === 'left') ||
        (path.parentPath && isLval(path.parentPath))
    );
};

const isTS = (path) => {
    return (
        path.node.type.toLowerCase().startsWith('ts') ||
        (path.parentPath && isTS(path.parentPath))
    );
};
