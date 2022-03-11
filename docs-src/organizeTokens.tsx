import Highlight from 'prism-react-renderer';
import { ByStart, TraceOutput, Info } from './Fixtures';

export const organizeTokens = (
    lines: Array<Array<Token>>,
    byStart: ByStart,
    traceOutput: TraceOutput,
    info: Info,
): FullToken => {
    // first split tokens
    // then annotate with ides
    const tokens: Array<Token & { at: number }> = [];
    let at = -1;
    lines.forEach((line) => {
        line.forEach((token) => {
            if (!token.content.length) {
                // console.log('empty token?');
                return;
            }
            let content = token.content;
            const m = content.match(/^\s+/);
            if (m && m[0].length < content.length) {
                tokens.push({ ...token, content: m[0], at });
                content = content.slice(m[0].length);
                at += m[0].length;
            }
            const end = content.match(/\s+$/);
            if (end && end[0].length < content.length) {
                tokens.push({
                    ...token,
                    content: content.slice(0, -end[0].length),
                    at,
                });
                at += content.length - end[0].length;
                tokens.push({ ...token, content: end[0], at });
                at += end[0].length;
            } else {
                tokens.push({ ...token, content, at });
                at += content.length;
            }
        });
        tokens.push({ content: '\n', types: [], at });
        at += 1;
    });

    const root: FullToken = {
        content: [],
        id: null,
        start: 0,
        end: at,
        widgets: [],
        parent: null,
    };

    let current = root;

    const addTokens = (before: number) => {
        while (
            tokens.length &&
            tokens[0].at < current.end &&
            tokens[0].at < before
        ) {
            (current.content as Array<FullToken>).push({
                id: null,
                start: tokens[0].at,
                end: tokens[0].at + tokens[0].content.length,
                widgets: [],
                content: tokens.shift()!,
                parent: current,
            });
        }
    };

    Object.keys(traceOutput)
        .map((k) => ({ id: +k, loc: traceOutput[+k].loc }))
        .concat(info.references.filter((t) => !!traceOutput[t.id]))
        .sort((a, b) => {
            // const ka = traceOutput[+a];
            // const kb = traceOutput[+b];
            return a.loc.start === b.loc.start
                ? b.loc.end - a.loc.end
                : a.loc.start - b.loc.start;
        })
        .forEach((v) => {
            while (v.loc.start >= current.end) {
                addTokens(current.end);
                current = current.parent!;
            }
            addTokens(v.loc.start);
            const token: FullToken = {
                content: [],
                id: v.id,
                start: v.loc.start,
                end: v.loc.end,
                widgets: [{ id: v.id, start: v.loc.start, end: v.loc.end }],
                parent: current,
            };
            (current.content as Array<FullToken>).push(token);
            current = token;
            // addTokens(v.loc.end);
        });
    while (current !== root) {
        addTokens(current.end);
        current = current.parent!;
    }
    addTokens(root.end);
    // console.log(root);
    /*

	so there's this recursive structure
	and at each token
	I need to know the list of active whatsits

	start,
	end,
	ids,
	children: [...]

	*/
    // tokens.forEach((token) => {
    //     if (byStart[token.at]) {
    //     }
    // });
    // // we need recursion probably?
    // // consume ... things ...
    // // waht about multiline? I don't really care about line highlighting.
    // // so maybe we just do inline-block everything, with newlines. let's do it.
    // // let at = 0;
    // // let current: Array<Item> = [];
    // const advance = (tok: Token) => {
    //     const num = tok.content.length;
    //     if (current.some((t) => t.end <= at + num)) {
    //         current = current.filter((t) => t.end > at + num);
    //     }
    //     for (let i = 0; i < num; i++) {
    //         at += 1;
    //         if (byStart[at - 1]) {
    //             current.push(
    //                 ...byStart[at - 1].map((m) => ({ ...m, start: at })),
    //             );
    //             // added.push(...byStart[at].map((m) => ({ ...m, start: at })));
    //         }
    //     }
    //     // at += num;
    //     return {
    //         content: tok,
    //         at: at - num,
    //         id: null,
    //         widgets: current.filter((c) => c.start === at - num),
    //     };
    // };
    // return split.map((line) => ({
    //     broken: line.map((tok) => advance(tok)),
    //     line,
    // }));
    return root;
};
type Token = Parameters<Highlight['getTokenProps']>[0]['token'];
export type FullToken = {
    content: Token | Array<FullToken>;
    id: null | number;
    start: number;
    end: number;
    widgets: Array<Item>;
    parent: FullToken | null;
};
type Item = {
    id: number;
    start: number;
    end: number;
};
