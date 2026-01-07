import {calcPathD} from '../../../editor/calcPathD';
import {RenderItem} from './eval/evaluate';
import {ConcreteShadow, shadowKey} from './export-types';
import {colorToString} from './utils/colors';

export function generateSvgItems(
    paths: (RenderItem & {type: 'path'})[],
    focus: string | null,
    lw: number,
) {
    const shadows: Record<string, ConcreteShadow> = {};
    let hasShadows = false;
    paths.map((item) => {
        if (item.shadow) {
            hasShadows = true;
            const key = shadowKey(item.shadow);
            shadows[key] = item.shadow;
        }
    });

    return [
        hasShadows ? (
            <defs>
                {Object.entries(shadows).map(([key, shadow]) => (
                    <filter key={key} id={key} x="-50%" width="200%" y="-50%" height="200%">
                        <feDropShadow
                            dx={shadow.offset?.x ?? 0}
                            dy={shadow.offset?.y ?? 0}
                            stdDeviation={((shadow.blur?.x ?? 0) + (shadow.blur?.y ?? 0)) / 2}
                            floodColor={colorToString(shadow.color ?? [0, 0, 0])}
                        />
                    </filter>
                ))}
            </defs>
        ) : null,
        paths.map(
            ({
                key,
                shapes,
                pk,
                color,
                strokeWidth,
                zIndex,
                shadow,
                sharp,
                adjustForZoom,
                ...item
            }) =>
                shapes.map((shape, m) => (
                    <path
                        {...item}
                        fill={
                            focus === key
                                ? 'red'
                                : strokeWidth
                                  ? 'none'
                                  : colorToString(shadow?.color ?? color)
                        }
                        strokeLinejoin={sharp ? 'miter' : 'round'}
                        strokeLinecap={sharp ? 'butt' : 'round'}
                        stroke={strokeWidth ? colorToString(shadow?.color ?? color) : undefined}
                        strokeWidth={strokeWidth && adjustForZoom ? strokeWidth * lw : strokeWidth}
                        filter={shadow ? `url(#${shadowKey(shadow)})` : undefined}
                        d={calcPathD(shape, 1, 5)}
                        key={`${key}-${m}`}
                        cursor={item.onClick ? 'pointer' : undefined}
                        onClick={item.onClick} // ?? (() => setFocus(focus === key ? null : key))}
                        data-z={zIndex}
                    />
                )),
        ),
    ];
}
