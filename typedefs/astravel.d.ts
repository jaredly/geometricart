declare module 'astravel' {
    import * as acorn from 'acorn';
    export interface SourceLocationPoint {
        line: number;
        column: number;
    }

    export interface SourceLocation {
        start: SourceLocationPoint;
        end: SourceLocationPoint;
    }

    export interface Comment {
        type: 'Line' | 'Block' | string;
        value: string;
        start: number;
        end: number;
        loc?: SourceLocation;
    }

    export interface BaseNode {
        type: string;
        start?: number;
        end?: number;
        loc?: SourceLocation;
        comments?: Comment[];
        trailingComments?: Comment[];
        [key: string]: unknown;
    }

    export type TravelerHandler<N extends BaseNode = BaseNode, S = unknown> = (
        node: N,
        state: S,
    ) => void;

    export interface Traveler<S = unknown> {
        super?: Traveler<S>;
        go: TravelerHandler<BaseNode, S>;
        find: (
            predicate: (node: BaseNode, state: S) => unknown,
            node: BaseNode,
            state: S,
        ) => {node: BaseNode; state: S} | undefined;
        makeChild: (properties?: Partial<Traveler<S>>) => Traveler<S>;
        [nodeType: string]: TravelerHandler<BaseNode, S> | unknown;
    }

    export const defaultTraveler: Traveler;
    export function makeTraveler<S = unknown>(properties?: Partial<Traveler<S>>): Traveler<S>;
    export function attachComments(ast: acorn.Program, comments: acorn.Comment[]): T;
}
