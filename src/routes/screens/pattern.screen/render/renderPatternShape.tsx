import {Coord} from '../../../../types';
import {Ctx, AnimCtx, RenderItem} from '../eval/evaluate';
import {ShapeStyle, ConcreteFill, ConcreteLine} from '../export-types';
import {notNull} from '../utils/notNull';
import {resolveT, resolveEnabledPMods} from '../utils/resolveMods';
import {dropNully, resolveFill, resolveLine, renderFill, renderLine} from './renderPattern';

export const renderPatternShape = <Kind,>(
    shape: Coord[],
    ctx: Ctx,
    i: number,
    panim: AnimCtx,
    locals: any,
    orderedStyles: {style: ShapeStyle<Kind>; match: boolean | Coord}[],
    open = false,
) => {
    const fills: Record<string, ConcreteFill> = {};
    const lines: Record<string, ConcreteLine> = {};

    const anim: Ctx['anim'] = {
        ...panim,
        values: {
            ...panim.values,
            ...locals,
        },
    };

    orderedStyles.forEach(({style: s, match}) => {
        if (s.disabled) {
            return;
        }
        // biome-ignore lint: any is fine here
        const local: Record<string, any> = {};
        if (s.t) {
            const got = resolveT(s.t, anim.values.t);
            if (got == null) return; // out of range
            local.t = got;
        }

        // stuff.push(`style id: ${s.id}`);
        if (typeof match === 'object') {
            local.styleCenter = match;
        }
        const localAnim = {...anim, values: {...anim.values, ...local}};

        const smod = resolveEnabledPMods(localAnim, s.mods);

        // hmmm need to align the ... style that it came from ... with animvalues
        // like `styleCenter`
        Object.values(s.fills).forEach((fill) => {
            const cfill = dropNully(resolveFill(localAnim, fill));
            if (cfill.enabled === false) {
                // stuff.push(`disabled fill: ${fill.id}`);
                return;
            }
            cfill.mods.push(...smod);
            // stuff.push(`fill: ${fill.id}`);
            if (!fills[fill.id]) {
                fills[fill.id] = cfill;
                return;
            }
            // merge: mods.
            const now = fills[fill.id];
            cfill.mods.unshift(...now.mods);
            Object.assign(now, cfill);
        });
        Object.values(s.lines).forEach((line) => {
            try {
                const cline = dropNully(resolveLine(localAnim, line));
                if (cline.enabled === false) return;
                cline.mods.push(...smod);
                if (!lines[line.id]) {
                    lines[line.id] = cline;
                    return;
                }
                const now = lines[line.id];
                cline.mods.unshift(...now.mods);
                Object.assign(now, cline);
            } catch (err) {
                localAnim.warn((err as Error).message);
            }
        });
    });

    const res: (RenderItem | undefined)[] = [
        ...Object.values(fills).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
            return renderFill(f, anim, ctx, shape, `fill-${i}-${fi}`);
        }),

        ...Object.values(lines).flatMap((f, fi): RenderItem[] | RenderItem | undefined => {
            return renderLine(f, anim, ctx, shape, `stroke-${i}-${fi}`, open);
        }),
    ];

    return res.filter(notNull);
};
