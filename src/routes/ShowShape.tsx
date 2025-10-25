import {boundsForCoords} from '../editor/Bounds';
import {Shape} from './getUniqueShapes';
import {shapeD} from './shapeD';

export const ShowShape = ({
    shape,
    size,
    highlight,
}: {
    shape: Shape;
    size: number;
    highlight?: boolean;
}) => {
    const bounds = boundsForCoords(...shape.rotated);
    const dim = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    const margin = dim / 10;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${(bounds.x0 - margin).toFixed(3)} ${(bounds.y0 - margin).toFixed(3)} ${(bounds.x1 - bounds.x0 + margin * 2).toFixed(3)} ${(
                bounds.y1 - bounds.y0 + margin * 2
            ).toFixed(3)}`}
            data-key={shape.key}
            style={{
                width: size,
                height: size,
                minWidth: size,
                minHeight: size,
            }}
            className={highlight ? 'text-amber-600' : 'text-black'}
        >
            <path
                d={shapeD(shape.rotated)}
                fill="currentcolor"
                stroke={highlight ? 'white' : '#555'}
                strokeWidth={dim / 50}
            />
            {/* <path d={shapeD(shape.scaled)} stroke="red" fill="none" strokeWidth={dim / 50} />
                <circle
                    cx={shape.axes[0].point.x}
                    cy={shape.axes[0].point.y}
                    r={dim / 50}
                    fill="white"
                />
                <circle
                    cx={shape.axes[0].src.x}
                    cy={shape.axes[0].src.y}
                    r={dim / 20}
                    fill="yellow"
                />
                <circle
                    cx={shape.axes[0].dest.x}
                    cy={shape.axes[0].dest.y}
                    r={dim / 50}
                    fill="orange"
                /> */}
        </svg>
    );
};
