import {History} from './history';

// AI generated

type SplitPath = {
    ancestor: string; // shared ancestor (LCA)
    up: string[]; // parent ids to move upward toward ancestor (one per step)
    down: string[]; // ids to move downward from ancestor to destination (one per step)
};

export function splitPathToDestination<T, An>(
    history: History<T, An>,
    destinationId: string,
    tipId: string = history.tip,
): SplitPath {
    const {nodes, root} = history;

    const getNode = (id: string) => {
        const n = nodes[id];
        if (!n) throw new Error(`Unknown node id: ${id}`);
        return n;
    };

    const parentOf = (id: string): string | null => {
        if (id === root) return null;
        const p = getNode(id).pid;
        // allow either "" or self-parenting roots in some datasets:
        if (!p || p === id) return null;
        return p;
    };

    // 1) Collect all ancestors of tip (including itself), with distance from tip.
    const distFromTip = new Map<string, number>();
    {
        let cur: string | null = tipId;
        let d = 0;
        while (cur != null) {
            distFromTip.set(cur, d++);
            cur = parentOf(cur);
        }
    }

    // 2) Walk up from destination until we hit an ancestor of tip => LCA.
    let lca: string | null = null;
    const destUpChain: string[] = []; // destination -> ... -> (just below lca)
    {
        let cur: string | null = destinationId;
        while (cur != null) {
            if (distFromTip.has(cur)) {
                lca = cur;
                break;
            }
            destUpChain.push(cur);
            cur = parentOf(cur);
        }
    }

    if (!lca) {
        throw new Error(`No shared ancestor found (history might be disconnected).`);
    }

    // 3) Build "up" from tip to lca:
    // We want parent IDs per step: from current node, which parent to go to.
    const stepsUp = distFromTip.get(lca)!;
    const up: string[] = [];
    {
        let cur = tipId;
        for (let i = 0; i < stepsUp; i++) {
            const p = parentOf(cur);
            if (!p) throw new Error(`Expected parent while walking up from ${cur}`);
            up.push(p); // the parent id to move to next
            cur = p;
        }
    }

    // 4) Build "down" from lca to destination:
    // destUpChain is [dest, parent, grandparent, ...] until below lca, so reverse it.
    const down = destUpChain.reverse();

    return {ancestor: lca, up, down};
}
