import * as acorn from 'acorn';
// @ts-ignore
import scan from 'scope-analyzer';
// @ts-ignore
import assignParent from 'estree-assign-parent';

export function processScript(source: string) {
    // 1. Parse to ESTree-ish AST
    let ast = acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        allowReturnOutsideFunction: true,
    });

    // 2. scope-analyzer expects .parent links
    ast = assignParent(ast);

    // 4. Walk & build scope info
    scan.crawl(ast);

    // 5. Root (program) scope
    const rootScope = scan.scope(ast);

    // 6. Names that are *used* but never declared anywhere in the AST
    const undeclared: string[] = rootScope.getUndeclaredNames();

    const needsReturn = ast.body.length === 1 && ast.body[0].type === 'ExpressionStatement';

    // If you want per-function info, you can walk the AST and call
    // scan.scope(node).getUndeclaredNames() on each function node.
    return {undeclared, arg: `{${undeclared.join(',')}}`, needsReturn};
}
