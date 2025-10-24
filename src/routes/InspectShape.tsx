import {useMemo} from 'react';
import {boundsForCoords} from '../editor/Bounds';
import {closeEnough} from '../rendering/epsilonToZero';
import {angleTo, push} from '../rendering/getMirrorTransforms';
import {angleBetween} from '../rendering/isAngleBetween';
import {Shape} from './getUniqueShapes';
import {arcPathFromCenter, shapeD} from './shapeD';
import {findConcyclicGroups, getTriplets} from './findConcyclicGroups';

export const InspectShape = ({shape}: {shape: Shape}) => {
    const bounds = boundsForCoords(...shape.rotated);
    const dim = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    const margin = dim / 10;

    const minLength = Math.min(...shape.lengths);
    const goalLength = dim / 20;

    const colors = [
        '--color-primary',
        '--color-secondary',
        '--color-accent',
        '--color-info',
        '--color-success',
        '--color-warning',
        '--color-error',
    ];

    // const groups = useMemo(() => {
    //     // return getTriplets(shape.rotated);
    //     return findConcyclicGroups(shape.rotated);
    // }, [shape.rotated]);

    const anglers = findAnnotations(shape, goalLength, colors);

    // groups.forEach((group) => {
    //     anglers.push(
    //         <circle
    //             fill="none"
    //             stroke="white"
    //             strokeDasharray={`${dim / 200} ${dim / 200}`}
    //             strokeWidth={dim / 400}
    //             cx={group.circle.cx}
    //             cy={group.circle.cy}
    //             r={group.circle.r}
    //         />,
    //     );
    // });

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
                }}
            >
                <path d={shapeD(shape.rotated)} fill="currentcolor" strokeWidth={dim / 50} />
                {anglers}
            </svg>
        </div>
    );
};

function findAnnotations(shape: Shape, goalLength: number, colors: string[]) {
    const anglers = [];
    const usedAngles = [];
    const usedLengths = [];
    for (let i = 0; i < shape.rotated.length; i++) {
        const pos = shape.rotated[i];
        const prev = shape.rotated[i === 0 ? shape.rotated.length - 1 : i - 1];
        const next = shape.rotated[(i + 1) % shape.rotated.length];

        const langle = angleTo(pos, prev) + Math.PI / 2;
        const roundedLength = Math.round(shape.lengths[i] * 100) / 100;
        let li = usedLengths.indexOf(roundedLength);
        if (li === -1) {
            li = usedLengths.length;
            usedLengths.push(roundedLength);
        }
        const mid = {x: (pos.x + prev.x) / 2, y: (pos.y + prev.y) / 2};
        anglers.push(
            <path
                d={shapeD([push(mid, langle, goalLength / 4), push(mid, langle, -goalLength / 4)])}
                stroke="currentcolor"
                // cx={mx}
                // cy={my}
                // r={Math.min(roundedLength / 8, goalLength / 2)}
                strokeWidth={goalLength / 10}
                style={{
                    color: `var(${colors[colors.length - 1 - (li % colors.length)]})`,
                }}
            />,
        );
        // anglers.push(
        //     <circle
        //         fill="currentcolor"
        //         cx={mx}
        //         cy={my}
        //         r={Math.min(roundedLength / 8, goalLength / 2)}
        //         style={{
        //             color: `var(${colors[colors.length - 1 - (li % colors.length)]})`,
        //         }}
        //     />,
        // );
        // Angles
        // const angle = shape.angles[(i + 1) % shape.rotated.length];
        const t0 = angleTo(pos, prev);
        const t1 = angleTo(pos, next);
        let between = angleBetween(t0, t1, true);
        const clockwise = between <= Math.PI;
        if (between >= Math.PI) {
            between = Math.PI * 2 - between;
        }
        const rounded = Math.round(between * 1000) / 1000;
        let ci = usedAngles.indexOf(rounded);
        if (ci === -1) {
            ci = usedAngles.length;
            usedAngles.push(rounded);
        }
        const r = Math.min(
            goalLength / 2,
            shape.lengths[i] / 4,
            shape.lengths[(i + 1) % shape.lengths.length] / 4,
        );
        anglers.push(
            <path
                d={
                    closeEnough(between, Math.PI / 2, 0.001)
                        ? shapeD([
                              push(pos, t0, r),
                              push(push(pos, t0, r), t1, r),
                              push(pos, t1, r),
                              pos,
                          ])
                        : `${arcPathFromCenter({
                              center: pos,
                              theta0: t0,
                              theta1: t1,
                              r,
                              // minLength / 10,
                              clockwise,
                          })} L${pos.x.toFixed(3)} ${pos.y.toFixed(3)}`
                }
                fill="currentcolor"
                // stroke="currentcolor"
                style={{
                    color: `var(${colors[ci % colors.length]})`,
                }}
            />,
        );
    }
    return anglers;
}
