import {useRef, useEffect} from 'react';
import {Tiling} from '../../../types';
import {drawShapes, drawLines, drawWoven, drawBounds} from '../../canvasDraw';
import {getPatternData} from '../../getPatternData';
import {pk} from '../../pk';

export const CanvasPattern = ({
    data,
    tiling,
    size = 300,
    showBounds,
    showWoven,
    showLines,
    showShapes,
    lineWidth,
    margin,
}: {
    data: ReturnType<typeof getPatternData>;
    tiling: Tiling;
    size?: number;
    showBounds?: boolean;
    showWoven?: boolean;
    showLines?: boolean;
    showShapes?: boolean;
    lineWidth: number;
    margin: number;
}) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        const surface = pk.MakeWebGLCanvasSurface(ref.current);
        if (!surface) return;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        ctx.scale((size * 2) / (2 + margin * 2), (size * 2) / (2 + margin * 2));
        ctx.translate(1 + margin, 1 + margin);

        if (showShapes) {
            drawShapes(ctx, data, false, data.minSegLength * lineWidth * 2);
        }
        if (showLines) {
            drawLines(ctx, data, data.minSegLength * lineWidth * 2);
        }
        if (showWoven) {
            drawWoven(ctx, data, data.minSegLength * lineWidth * 2);
        }
        if (showBounds) {
            drawBounds(ctx, data);
        }
        surface.flush();
        // ok do the render
    }, [tiling, data, showShapes, showLines, showWoven, showBounds, lineWidth, margin]);
    return (
        <canvas ref={ref} width={size * 2} height={size * 2} style={{width: size, height: size}} />
    );
};
