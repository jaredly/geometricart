/*
So there are multiple kinds of things
and different kinds of things can be children of different kinds of things
and we might as well handle copy/cut/paste/duplicate as well

Is the plan to make a toplevel listing? and then hand that off to the
component to make the tree? perhaps.


*/

export type TreeViewContext = {
    // we'll do `kind:id to prevent funny business
    nodes: Record<string, {id: string; order: number; kind: string; children: string[]}>;
    kinds: Record<
        string,
        {
            childKinds: string[]; // governs drap & drop
            render(id: string): React.ReactNode;
        }
    >;
    actions: {
        move(id: string, parent: string, newParent: string, order: number): void;
        insert(id: string, parent: string, order: number): void;
        delete(id: string, parent: string): void;
    };
    rootId: string;
};
