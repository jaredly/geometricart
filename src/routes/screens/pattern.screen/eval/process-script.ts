import * as acorn from 'acorn';
// @ts-ignore
import assignParent from 'estree-assign-parent';
// @ts-ignore
import {crawl, getScope} from './scope-analyzer.js';

export function processScript(source: string) {
    if (source.match(/^\s*{\s*[a-zA-Z_0-9]+\s*:/) && source.match(/}\s*$/)) {
        source = `(${source})`;
    }
    // 1. Parse to ESTree-ish AST
    let ast = acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        allowReturnOutsideFunction: true,
    });

    // 2. scope-analyzer expects .parent links
    ast = assignParent(ast);

    // 4. Walk & build scope info
    crawl(ast);

    // 5. Root (program) scope
    const rootScope = getScope(ast);

    // 6. Names that are *used* but never declared anywhere in the AST
    const undeclared: string[] = rootScope.getUndeclaredNames();

    const needsReturn = ast.body.length === 1 && ast.body[0].type === 'ExpressionStatement';

    // If you want per-function info, you can walk the AST and call
    // scan.scope(node).getUndeclaredNames() on each function node.
    return {undeclared, arg: `{${undeclared.join(',')}}`, needsReturn};
}
