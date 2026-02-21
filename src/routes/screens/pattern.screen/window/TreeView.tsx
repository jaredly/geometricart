/*
So there are multiple kinds of things
and different kinds of things can be children of different kinds of things
and we might as well handle copy/cut/paste/duplicate as well

Is the plan to make a toplevel listing? and then hand that off to the
component to make the tree? perhaps.
*/

import {useMemo, useState} from 'react';
import {useExpanded} from './state';
import {ChevronUp12, DotsHorizontalOutline} from '../../../../icons/Icon';

export type TreeNode = {
    name: string;
    children: string[];
    kind: string;
    id: string;
    childKinds: string[];
    // rightIcons: React.ReactNode[];
    rightIcons?: (id: string, kind: string) => React.ReactNode;
    preview?: React.ReactNode;
};

export type TreeActions = {
    move(id: string, parent: string, newParent: string, order: number): void;
    insert(id: string, parent: string, order: number): void;
    delete(id: string, parent: string): void;
    rename(id: string, name: string): void;
    add(kind: string, parent: string, subKind?: string): void;
    subKinds: Record<string, string[]>;
};

type Props = {
    actions: TreeActions;
    nodes: Record<string, TreeNode>;
    selection: string[] | null;
    setSelection: (s: string[] | null) => void;
    root: string;
};

type CTX = {
    refs: Record<string, HTMLDivElement>;
    nodes: Record<string, TreeNode>;
    actions: TreeActions;
    selection: string[] | null;
    setSelection: (sel: string[] | null) => void;
};

const nullPath: string[] = [];

export const TreeView = ({actions, nodes, root, selection, setSelection}: Props) => {
    const refs: CTX['refs'] = useMemo(() => ({}), []);
    const ctx = useMemo(
        (): CTX => ({refs, nodes, actions, selection, setSelection}),
        [refs, nodes, actions, selection, setSelection],
    );

    return <TreeNodeView ctx={ctx} id={root} path={nullPath} />;
};

const TreeNodeView = ({ctx, id, path}: {ctx: CTX; id: string; path: string[]}) => {
    const node = ctx.nodes[id];
    const childPath = useMemo(() => [...path, id], [path, id]);
    const [expanded, setExpanded] = useExpanded(`tree-node-${id}`);
    const [editing, setEditing] = useState<null | string>(null);
    const selected =
        ctx.selection?.[ctx.selection.length - 1] === id ? 2 : ctx.selection?.includes(id) ? 1 : 0;
    if (!node) {
        return <div>{id} no node</div>;
    }

    const children = (
        <div className={path.length === 0 ? '' : 'pl-10'}>
            {node.children.map((id) => (
                <TreeNodeView key={id} id={id} ctx={ctx} path={childPath} />
            ))}
            {node.childKinds.length === 1 ? (
                ctx.actions.subKinds[node.childKinds[0]] ? (
                    <select
                        className="select cursor-pointer select-sm"
                        value=""
                        onChange={(evt) => {
                            if (
                                ctx.actions.subKinds[node.childKinds[0]].includes(evt.target.value)
                            ) {
                                ctx.actions.add(node.childKinds[0], node.id, evt.target.value);
                            }
                        }}
                    >
                        <option value="">Add {node.childKinds[0]}</option>
                        {ctx.actions.subKinds[node.childKinds[0]].map((kind) => (
                            <option key={kind} value={kind}>
                                {kind}
                            </option>
                        ))}
                    </select>
                ) : (
                    <button
                        className="btn"
                        onClick={() => ctx.actions.add(node.childKinds[0], node.id)}
                    >
                        Add {node.childKinds[0]}
                    </button>
                )
            ) : (
                <select
                    className="select cursor-pointer select-sm"
                    value=""
                    onChange={(evt) => {
                        if (node.childKinds.includes(evt.target.value)) {
                            ctx.actions.add(evt.target.value, node.id);
                        }
                    }}
                >
                    <option value="">Add child</option>
                    {node.childKinds.map((kind) => (
                        <option key={kind} value={kind}>
                            {kind}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );

    if (path.length === 0) {
        return children;
    }
    return (
        <div>
            <div
                className={
                    'flex' +
                    (selected === 2 ? ' bg-amber-500' : selected === 1 ? ' bg-amber-800' : '')
                }
                onClick={() =>
                    selected === 2 ? ctx.setSelection(null) : ctx.setSelection(childPath)
                }
                ref={(div) => {
                    if (div) ctx.refs[node.id] = div;
                }}
            >
                {node.childKinds.length ? (
                    <div
                        // Do some onDrag stuff I guess
                        onClick={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="p-2 mr-2 hover:bg-amber-400 hover:text-amber-950 rounded-4xl transition-colors"
                    >
                        <ChevronUp12 className={expanded ? 'rotate-180' : 'rotate-90'} />
                    </div>
                ) : (
                    <div>
                        <DotsHorizontalOutline />
                    </div>
                )}
                {node.preview}
                {editing != null ? (
                    <input
                        value={editing}
                        onChange={(evt) => setEditing(evt.target.value)}
                        autoFocus
                        onBlur={() => {
                            ctx.actions.rename(node.id, editing);
                            setEditing(null);
                        }}
                    />
                ) : (
                    <div onClick={() => setEditing(node.name)}>{node.name}</div>
                )}
                <div className="flex-1" />
                <div className="justify-end">{node.rightIcons?.(node.id, node.kind)}</div>
            </div>
            {expanded && children}
        </div>
    );
};
