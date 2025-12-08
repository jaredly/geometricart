import {useRef, useEffect} from 'react';
import {Tiling} from '../../../types';
import {drawShapes, drawLines, drawWoven, drawBounds} from '../../canvasDraw';
import {getPatternData} from '../../getPatternData';
import {pk} from '../../pk';
import {Box} from './export-types';

export const CanvasPattern = ({
    data,
    tiling,
    size = 300,
    showBounds,
    showWoven,
    showLines,
    showShapes,
    lineWidth,
    zoomProps,
    sharp,
}: {
    data: ReturnType<typeof getPatternData>;
    tiling: Tiling;
    size?: number;
    showBounds?: boolean;
    showWoven?: boolean;
    showLines?: boolean;
    showShapes?: boolean;
    sharp?: boolean;
    lineWidth: number;
    zoomProps: {innerRef: React.RefObject<SVGElement | HTMLElement | null>; box: Box};
}) => {
    useEffect(() => {
        if (!zoomProps.innerRef.current) return;

        const surface = pk.MakeWebGLCanvasSurface(zoomProps.innerRef.current as HTMLCanvasElement);
        if (!surface) return;
        const ctx = surface.getCanvas();
        ctx.clear(pk.BLACK);

        const {box} = zoomProps;
        ctx.save();
        ctx.scale(surface.width() / box.width, surface.height() / box.height);
        ctx.translate(-box.x, -box.y);

        if (showShapes) {
            drawShapes(ctx, data, false, data.minSegLength * lineWidth * 2, !!sharp);
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
        ctx.restore();
        surface.flush();
        // ok do the render
    }, [tiling, data, showShapes, showLines, showWoven, showBounds, lineWidth, sharp, zoomProps]);
    return (
        <canvas
            ref={zoomProps.innerRef as React.RefObject<HTMLCanvasElement>}
            width={size * 2}
            height={size * 2}
            style={{width: size, height: size}}
        />
    );
};
