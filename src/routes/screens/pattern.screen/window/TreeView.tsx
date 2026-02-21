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

export type TreeNode<Kind extends {type: string}> = {
    name: string;
    children: string[];
    id: Kind;
    childKinds: string[];
    // rightIcons: React.ReactNode[];
    rightIcons?: (kind: Kind) => React.ReactNode;
    preview?: React.ReactNode;
};

export type TreeActions<Kind extends {type: string}> = {
    move(id: Kind, parent: Kind, newParent: Kind, order: number): void;
    insert(id: Kind, parent: Kind, order: number): void;
    delete(id: Kind, parent: Kind): void;
    rename(id: Kind, name: string): void;
    add(kind: string, parent: Kind, subKind?: string): void;
    subKinds: Record<string, string[]>;
};

type Props<Kind extends {type: string}> = {
    actions: TreeActions<Kind>;
    nodes: Record<string, TreeNode<Kind>>;
    selection: string[] | null;
    setSelection: (s: string[] | null) => void;
    kindToString: (k: Kind) => string;
    root: string;
};

type CTX<Kind extends {type: string}> = {
    kindToString: (k: Kind) => string;
    refs: Record<string, HTMLDivElement>;
    nodes: Record<string, TreeNode<Kind>>;
    actions: TreeActions<Kind>;
    selection: string[] | null;
    setSelection: (sel: string[] | null) => void;
};

const nullPath: string[] = [];

export const TreeView = <Kind extends {type: string}>({
    actions,
    nodes,
    root,
    selection,
    setSelection,
    kindToString,
}: Props<Kind>) => {
    const refs: CTX<Kind>['refs'] = useMemo(() => ({}), []);
    const ctx = useMemo(
        (): CTX<Kind> => ({refs, nodes, actions, selection, setSelection, kindToString}),
        [refs, nodes, actions, selection, setSelection, kindToString],
    );

    return <TreeNodeView ctx={ctx} id={root} path={nullPath} />;
};

const TreeNodeView = <Kind extends {type: string}>({
    ctx,
    id,
    path,
}: {
    ctx: CTX<Kind>;
    id: string;
    path: string[];
}) => {
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
                    if (div) ctx.refs[ctx.kindToString(node.id)] = div;
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
                <div className="justify-end">{node.rightIcons?.(node.id)}</div>
            </div>
            {expanded && children}
        </div>
    );
};
