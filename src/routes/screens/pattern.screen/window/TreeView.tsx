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

type TreeNode = {
    name: string;
    children: string[];
    kind: string;
    id: string;
    childKinds: string[];
    rightIcons: React.ReactNode[];
    preview?: React.ReactNode;
};

type TreeActions = {
    move(id: string, parent: string, newParent: string, order: number): void;
    insert(id: string, parent: string, order: number): void;
    delete(id: string, parent: string): void;
    rename(id: string, name: string): void;
    add(kind: string, parent: string): void;
};

type Props = {
    actions: TreeActions;
    nodes: Record<string, TreeNode>;
    root: string;
};

type CTX = {
    refs: Record<string, HTMLDivElement>;
    nodes: Record<string, TreeNode>;
    actions: TreeActions;
};

export const TreeView = ({actions, nodes, root}: Props) => {
    // biome-ignore lint/correctness/useExhaustiveDependencies: I update it too
    const ctx = useMemo((): CTX => ({refs: {}, nodes, actions}), []);
    ctx.nodes = nodes;
    ctx.actions = actions;
    return <TreeNodeView ctx={ctx} id={root} />;
};

const TreeNodeView = ({ctx, id}: {ctx: CTX; id: string}) => {
    const node = ctx.nodes[id];
    const [expanded, setExpanded] = useExpanded(`tree-node-${id}`);
    const [editing, setEditing] = useState<null | string>(null);
    return (
        <div>
            <div
                className="flex"
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
                <div className="flex-1 justify-end">{node.rightIcons}</div>
            </div>
            {expanded && (
                <div>
                    {node.children.map((id) => (
                        <TreeNodeView key={id} id={id} ctx={ctx} />
                    ))}
                    {node.childKinds.length === 1 ? (
                        <button onClick={() => ctx.actions.add(node.childKinds[0], node.id)}>
                            Add
                        </button>
                    ) : (
                        <select
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
            )}
        </div>
    );
};
