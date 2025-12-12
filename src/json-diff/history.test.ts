import {describe, it, expect} from 'bun:test';
import {dispatch, jump, History} from './history';
import {diffBuilder, JsonPatchOp, PendingJsonPatchOp} from './helper2';

type Article = {
    title: string;
    meta: {
        tags: string[];
        flags: {archived: boolean; featured: boolean};
    };
    sections: Array<{
        heading: string;
        paragraphs: string[];
    }>;
};

const path = (...keys: (string | number)[]) => keys.map((key) => ({type: 'key' as const, key}));

const initialArticle: Article = {
    title: 'First Draft',
    meta: {tags: ['draft'], flags: {archived: false, featured: false}},
    sections: [{heading: 'Intro', paragraphs: ['hello world']}],
};

const makeHistory = (current: Article): History<Article, string> => ({
    nodes: {root: {id: 'root', pid: 'root', changes: [], children: []}},
    root: 'root',
    tip: 'root',
    current,
    undoTrail: [],
});

const idGenerator = () => {
    let count = 0;
    return () => `node-${++count}`;
};

const builder = diffBuilder<Article>('type');

function fill<T>(pending: PendingJsonPatchOp<T>, value: any): JsonPatchOp<T> {
    switch (pending.op) {
        case 'add':
        case 'move':
        case 'copy':
            return pending;
        case 'replace':
            return {...pending, previous: value};
        case 'remove':
            return {...pending, value: value};
        case 'push': {
            return {
                op: 'add',
                path: [...pending.path, {type: 'key', key: value}],
                value: pending.value,
            } as JsonPatchOp<T>;
        }
    }
}

describe('dispatch', () => {
    it('applies pending operations, stores them on a new node, and updates current', () => {
        const genId = idGenerator();
        let history = makeHistory(initialArticle);

        const updates: Array<PendingJsonPatchOp<Article> | PendingJsonPatchOp<Article>[]> = [
            builder.title.replace('Revised Title'),
            builder.meta.tags.push('published'),
        ];

        history = dispatch(history, updates, genId);

        expect(history.tip).toBe('node-1');
        expect(history.undoTrail).toEqual([]);
        expect(history.nodes.root.children).toEqual(['node-1']);
        expect(history.nodes['node-1'].changes).toEqual([
            fill(builder.title.replace('Revised Title'), 'First Draft'),
            fill(builder.meta.tags.push('published'), 1),
        ]);
        expect(history.current).toEqual({
            title: 'Revised Title',
            meta: {tags: ['draft', 'published'], flags: {archived: false, featured: false}},
            sections: [{heading: 'Intro', paragraphs: ['hello world']}],
        });
    });
});

describe('undo/redo', () => {
    it('walks back and forward through history while keeping undoTrail in sync', () => {
        const genId = idGenerator();
        let history = makeHistory(initialArticle);

        history = dispatch(history, [builder.meta.flags.featured.replace(true)], genId);
        const afterFirst = history;

        history = dispatch(
            history,
            [builder.sections.push({heading: 'Deep Dive', paragraphs: ['details']})],
            genId,
        );
        const afterSecond = history;

        const backOne = dispatch(history, {op: 'undo'});
        expect(backOne.tip).toBe('node-1');
        expect(backOne.undoTrail).toEqual(['node-2']);
        expect(backOne.current).toEqual(afterFirst.current);

        const backToRoot = dispatch(backOne, {op: 'undo'});
        expect(backToRoot.tip).toBe('root');
        expect(backToRoot.undoTrail).toEqual(['node-1', 'node-2']);
        expect(backToRoot.current).toEqual(initialArticle);

        const redoFirst = dispatch(backToRoot, {op: 'redo'});
        expect(redoFirst.tip).toBe('node-1');
        expect(redoFirst.undoTrail).toEqual(['node-2']);
        expect(redoFirst.current.meta.flags.featured).toBe(true);
        expect(redoFirst.current.sections.length).toBe(1);

        const redoSecond = dispatch(redoFirst, {op: 'redo'});
        expect(redoSecond.tip).toBe('node-2');
        expect(redoSecond.undoTrail).toEqual([]);
        expect(redoSecond.current).toEqual(afterSecond.current);
    });
});

describe('jump', () => {
    it('recomputes current when moving between branches', () => {
        const genId = idGenerator();
        let history = makeHistory(initialArticle);

        history = dispatch(history, [builder.meta.flags.featured.replace(true)], genId);
        const firstBranchTip = history.tip;

        history = dispatch(
            history,
            [builder.sections.push({heading: 'Follow Up', paragraphs: ['later']})],
            genId,
        );
        const mainlineTip = history.tip;
        const mainlineState = history.current;

        history = jump(history, firstBranchTip);
        expect(history.tip).toBe(firstBranchTip);
        expect(history.undoTrail).toEqual([]);
        expect(history.current.sections.length).toBe(1);

        history = dispatch(history, [builder.meta.tags[0].replace('finalized')], genId);
        const branchTip = history.tip;

        expect(history.nodes[firstBranchTip].children).toEqual([mainlineTip, branchTip]);
        expect(history.current.meta.tags).toEqual(['finalized']);

        history = jump(history, mainlineTip);
        expect(history.tip).toBe(mainlineTip);
        expect(history.undoTrail).toEqual([]);
        expect(history.current).toEqual(mainlineState);
    });
});
