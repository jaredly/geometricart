import {tokenizer, Token, Comment, Position} from 'acorn';

export function highlightJS(code: string) {
    const comments: {type: 'comment'; block: boolean; start: number; end: number}[] = [];

    const tok = tokenizer(code, {
        ecmaVersion: 'latest',
        onComment(block, text, start, end) {
            comments.push({
                type: 'comment',
                block,
                start,
                end,
            });
        },
    });

    // Collect tokens
    const items = [];
    for (const token of tok) {
        items.push(token);
    }

    // Merge + sort tokens and comments
    items.push(...comments);
    items.sort((a, b) => a.start - b.start);

    let out = '';
    let lastPos = 0;

    for (const item of items) {
        if (item.start > lastPos) {
            out += escapeHTML(code.slice(lastPos, item.start));
        }

        const text = code.slice(item.start, item.end);

        if (item.type === 'comment') {
            out += `<span class="comment">${escapeHTML(text)}</span>`;
        } else {
            const cls = tokenClass(item);
            out += cls ? `<span class="${cls}">${escapeHTML(text)}</span>` : escapeHTML(text);
        }

        lastPos = item.end;
    }

    out += escapeHTML(code.slice(lastPos));
    return out;
}

function tokenClass(token: Token) {
    const t = token.type;

    if (t.keyword) return 'kw';
    if (t.label === 'name') return 'id';
    if (t.label === 'num') return 'num';
    if (t.label === 'string' || t.label === 'template') return 'str';
    if (t.label === 'regexp') return 're';
    if (t.label === 'null' || t.label === 'true' || t.label === 'false') return 'lit';
    // @ts-ignore
    if (t.binop || t.isAssign || t.prefix || t.postfix) return 'op';
    if (t.label === 'privateId') return 'priv';

    return 'pun';
}

function escapeHTML(str: string) {
    return str.replace(/[&<>"]/g, (c) =>
        c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
    );
}
