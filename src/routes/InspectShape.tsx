import {boundsForCoords} from '../editor/Bounds';
import {angleTo} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {Shape} from './getUniqueShapes';
import {arcPathFromCenter, shapeD} from './shapeD';

export const InspectShape = ({shape}: {shape: Shape}) => {
    const bounds = boundsForCoords(...shape.rotated);
    const dim = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    const margin = dim / 10;

    const minLength = Math.min(...shape.lengths);

    const colors = [
        '--color-primary',
        '--color-secondary',
        '--color-accent',
        '--color-info',
        '--color-success',
        '--color-warning',
        '--color-error',
    ];
    const anglers = [];
    const used = [];
    for (let i = 0; i < shape.rotated.length; i++) {
        const pos = shape.rotated[i];
        const prev = shape.rotated[i === 0 ? shape.rotated.length - 1 : i - 1];
        const next = shape.rotated[(i + 1) % shape.rotated.length];
        const angle = shape.angles[(i + 1) % shape.rotated.length];
        const t0 = angleTo(pos, prev);
        const t1 = angleTo(pos, next);
        let between = angleBetween(t0, t1, true);
        const clockwise = between <= Math.PI;
        if (between >= Math.PI) {
            between = Math.PI - between;
        }
        const rounded = Math.round(angle * 100) / 100;
        let ci = used.indexOf(rounded);
        if (ci === -1) {
            ci = used.length;
            used.push(rounded);
        }
        anglers.push(
            <path
                d={
                    `
                    ${arcPathFromCenter({
                        center: pos,
                        theta0: t0,
                        theta1: t1,
                        r: minLength / 10,
                        clockwise,
                    })}
                    L${pos.x.toFixed(3)} ${pos.y.toFixed(3)}
                    `
                    //     shapeD([
                    //     pos,
                    //     push(pos, angleTo(pos, prev), minLength / 10),
                    //     push(pos, angleTo(pos, next), minLength / 10),
                    // ])
                }
                fill="currentcolor"
                style={{
                    color: `var(${colors[ci % colors.length]})`,
                }}
                // stroke={highlight ? 'white' : '#555'}
                strokeWidth={dim / 50}
            />,
        );
    }

    return (
        <div className="modal-box flex flex-col w-11/12 max-w-5xl">
            <h3 className="font-bold text-lg">Inspect Shape</h3>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`${(bounds.x0 - margin).toFixed(3)} ${(bounds.y0 - margin).toFixed(3)} ${(bounds.x1 - bounds.x0 + margin * 2).toFixed(3)} ${(
                    bounds.y1 - bounds.y0 + margin * 2
                ).toFixed(3)}`}
                data-key={shape.key}
                style={{
                    width: 'calc(100% - 20px)',
                    height: 'calc(100% - 20px)',
                    color: 'black',
                    // minWidth: size,
                    // minHeight: size,
                }}
            >
                <path
                    d={shapeD(shape.rotated)}
                    fill="currentcolor"
                    // stroke={highlight ? 'white' : '#555'}
                    strokeWidth={dim / 50}
                />
                {anglers}
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
        </div>
    );
};
