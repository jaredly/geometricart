// biome-ignore-all lint/suspicious/noExplicitAny : this is internal and fine
import {Coord, Tiling} from '../../../types';
import {PKPath} from '../../pk';
import {
    State,
    Layer,
    AnimatableNumber,
    AnimatableBoolean,
    AnimatableCoord,
    AnimatableColor,
    Crop,
} from './export-types';
import {processScript} from './process-script';

export type AnimCtx = {
    accessedValues?: Set<string>;
    values: Record<string, any>;
    cache: Map<string, {fn: AnimFn; needs: string[]}>;
    warn(m: string): void;
    palette: string[];
};

export type Ctx = {
    // warn(m: string): void;
    state: State;
    anim: AnimCtx;
    cropCache: Map<string, {path: PKPath; crop: Crop}>;
    layer: Layer;
    patterns: Patterns;
    items: React.ReactNode[];
};

type AnimFn = (ctx: AnimCtx['values']) => any;

const getScript = (ctx: AnimCtx, v: string) => {
    if (!ctx.cache.has(v)) {
        try {
            const {undeclared, arg, needsReturn} = processScript(v);
            // oneliners can leave off the return
            if (needsReturn) v = 'return ' + v;
            ctx.cache.set(v, {fn: new Function(arg, v) as AnimFn, needs: undeclared});
        } catch (err) {
            console.log('failure', err);
            return null;
        }
    }
    return ctx.cache.get(v)!;
};

const evaluate = <T,>(ctx: AnimCtx, s: string, check: (v: any) => v is T, otherwise: T): T => {
    const sc = getScript(ctx, s);
    if (!sc) return otherwise;
    sc.needs.forEach((k) => {
        if (!(k in ctx.values)) {
            ctx.warn(`missing expected value`);
        }
        ctx.accessedValues?.add(k);
    });
    // console.log('with', ctx.values, sc.needs);
    try {
        const v = sc.fn(ctx.values);
        if (!check(v)) {
            ctx.warn(`couldnt get number: ${JSON.stringify(v)}`);
            return otherwise;
        }
        return v;
    } catch (err) {
        ctx.warn(`Error while running script ${err}`);
        return otherwise;
    }
};

function isValidColor(color: string): boolean {
    if (color.charAt(0) === '#') {
        color = color.substring(1);
        return [3, 4, 6, 8].indexOf(color.length) > -1 && !Number.isNaN(parseInt(color, 16));
    } else {
        if (color.match(/^[a-z]+$/)) {
            return true;
        }
        return /^(rgb|hsl)a?\((\d+%?(deg|rad|grad|turn)?[,\s]+){2,3}[\s\/]*[\d\.]+%?\)$/i.test(
            color,
        );
    }
}

const isCoord = (v: any): v is Coord => {
    return (
        typeof v === 'object' &&
        v &&
        'x' in v &&
        'y' in v &&
        typeof v.x === 'number' &&
        typeof v.y === 'number'
    );
};

export const a = {
    number: (ctx: AnimCtx, v: AnimatableNumber): number =>
        typeof v === 'number' ? v : evaluate<number>(ctx, v, (v) => typeof v === 'number', 0),
    boolean: (ctx: AnimCtx, v: AnimatableBoolean): boolean =>
        typeof v === 'boolean'
            ? v
            : evaluate<boolean>(ctx, v, (v) => typeof v === 'boolean', false),
    coord: (ctx: AnimCtx, v: AnimatableCoord): Coord =>
        typeof v === 'object' ? v : evaluate<Coord>(ctx, v, isCoord, {x: 0, y: 0}),
    coordOrNumber: (ctx: AnimCtx, v: AnimatableCoord | AnimatableNumber): Coord | number =>
        typeof v === 'object'
            ? v
            : typeof v === 'number'
              ? v
              : evaluate<Coord | number>(
                    ctx,
                    v,
                    (v: any): v is number | Coord => typeof v === 'number' || isCoord(v),
                    {x: 0, y: 0},
                ),
    color: (ctx: AnimCtx, v: AnimatableColor): string => {
        if (typeof v === 'string') {
            if (isValidColor(v.trim())) {
                return v.trim();
            }
            v = evaluate<string | number>(
                ctx,
                v,
                (v) => typeof v === 'string' || typeof v === 'number',
                '#fff',
            );
        }
        if (typeof v === 'number') {
            return ctx.palette[v % ctx.palette.length];
        }
        if (!isValidColor(v)) {
            throw new Error(`not a color: ${v}`);
        }
        return v;
    },
};
export type Patterns = Record<string, Tiling>;
