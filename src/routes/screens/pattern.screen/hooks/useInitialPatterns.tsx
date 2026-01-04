import {unique} from '../../../shapesFromSegments';
import {ExportHistory} from '../ExportHistory';
import {notNull} from '../utils/resolveMods';
import {usePromise} from './usePromise';

export function useInitialPatterns(state?: ExportHistory | null) {
    return usePromise(
        async (signal) => {
            if (!state) return {};
            const ids = unique(
                Object.values(state.current.layers)
                    .flatMap((l) =>
                        Object.values(l.entities).map((e) =>
                            e.type === 'Pattern' && typeof e.tiling === 'string' ? e.tiling : null,
                        ),
                    )
                    .filter(notNull),
                (x) => x,
            );
            console.log('need to load patterns', ids);
            const values = await Promise.all(
                ids.map((id) =>
                    fetch(`/gallery/pattern/${id}/json`, {signal}).then((r) => r.json()),
                ),
            );
            return Object.fromEntries(ids.map((id, i) => [id, values[i]]));
        },
        [state],
    );
}
