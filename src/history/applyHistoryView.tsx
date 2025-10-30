import {State, View} from '../types';

export function applyHistoryView(
    viewPoints: {idx: number; view: Pick<View, 'zoom' | 'center'>}[],
    current: number,
    // zooms: NonNullable<State['historyView']>['zooms'],
    hstate: State,
) {
    let relevantView = null;
    // console.log('zoomz', zooms);
    for (let vp of viewPoints) {
        if (vp.idx > current) break;
        relevantView = vp;
        // const f = zooms.find((z) => z.idx === vp.idx);
        // if (f) {
        //     console.log('found zoom for', vp.idx);
        //     relevantView = f;
        // }
    }
    if (relevantView) {
        hstate = {
            ...hstate,
            view: {
                ...hstate.view,
                center: relevantView.view.center,
                zoom: relevantView.view.zoom,
            },
        };
    }
    return hstate;
}
