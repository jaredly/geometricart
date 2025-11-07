declare module '@babel/traverse' {
    import {Node, Visitor} from '@babel/types';

    export interface NodePath<T = Node> {
        node: T;
        parent: Node;
        key: string | number;
        container: any;
        hub: any;
        scope: any;
        type: string;
    }

    export default function traverse<S = any>(
        parent: Node | Node[],
        opts: Visitor<S>,
        scope?: any,
        state?: S,
        parentPath?: NodePath,
    ): void;

    export {NodePath};
}
