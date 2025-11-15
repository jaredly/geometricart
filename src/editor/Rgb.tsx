import * as React from 'react';
import {Attachment, Coord} from '../types';
import {createPortal} from 'react-dom';
import {hslToRgb} from '../rendering/colorConvert';
import {averageAt, findMajorColorsExpensive, rgbToString} from './PalettesForm';

const ImageChooser = ({
    contents,
    onChoose,
}: {
    contents: string;
    onHover: (color: Rgb) => void;
    onChoose: (color: Rgb) => void;
}) => {
    const ref = React.useRef(null as null | HTMLCanvasElement);
    const data = React.useRef(null as null | ImageData);
    const [colors, setColors] = React.useState(null as null | Array<Array<number>>);

    React.useEffect(() => {
        if (!ref.current) {
            return;
        }
        const ctx = ref.current.getContext('2d')!;
        const image = new Image();
        image.crossOrigin = 'Anonymous';
        image.src = contents;
        image.onload = () => {
            ctx.canvas.height = 800;
            ctx.canvas.width = (image.naturalWidth / image.naturalHeight) * ctx.canvas.height;
            ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
            data.current = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            console.log('finding them thanks');
            // setColors(findMajorColorsExpensive(data.current));
        };
    }, [contents]);

    const [hover, setHover] = React.useState(null as null | {color: Rgb; pos: Coord});

    return (
        <div css={{position: 'relative'}}>
            <canvas
                ref={ref}
                onMouseMove={(evt) => {
                    if (!data.current) {
                        return;
                    }
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const pos = {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    };
                    setHover({color: averageAt(data.current, pos), pos});
                }}
                onClick={(evt) => {
                    if (!data.current) {
                        return;
                    }
                    const rect = evt.currentTarget.getBoundingClientRect();
                    const pos = {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top,
                    };
                    onChoose(averageAt(data.current, pos));
                }}
            />
            {colors ? (
                <div>
                    {/* {[0.2, 0.5, 0.7].map((lightness, i) => ( */}
                    <div css={{display: 'flex', flexDirection: 'row'}}>
                        {colors.map(([h, s, l], i) => (
                            <div
                                onClick={() => {
                                    const [r, g, b] = hslToRgb(h, s, l);
                                    onChoose({
                                        r: Math.floor(r),
                                        g: Math.floor(g),
                                        b: Math.floor(b),
                                    });
                                }}
                                key={i}
                                style={{
                                    cursor: 'pointer',
                                    background: `hsl(${(h * 360).toFixed(
                                        2,
                                    )}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%)`,
                                    width: 20,
                                    height: 20,
                                }}
                            />
                        ))}
                    </div>
                    {/* ))} */}
                </div>
            ) : null}
            <button
                css={{display: 'block'}}
                onClick={() => {
                    setColors(findMajorColorsExpensive(data.current!));
                }}
            >
                Autodetect major colors
            </button>
            {hover ? (
                <div
                    style={{
                        left: hover.pos.x + 10,
                        top: hover.pos.y + 10,
                        backgroundColor: rgbToString(hover.color),
                    }}
                    css={{
                        position: 'absolute',
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        border: '1px solid red',
                    }}
                />
            ) : null}
        </div>
    );
};

export type Rgb = {r: number; g: number; b: number};
export const AttachmentsChooser = ({
    onChoose,
    attachments,
}: {
    onChoose: (color: Rgb | null) => void;
    attachments: {[key: string]: Attachment};
}) => {
    const portal = React.useMemo(() => {
        return document.createElement('div');
    }, []);
    React.useEffect(() => {
        document.body.append(portal);
        return () => {
            document.body.removeChild(portal);
        };
    }, [portal]);
    const [hover, setHover] = React.useState(null as null | Rgb);
    return createPortal(
        <div
            css={{
                position: 'fixed',
                background: 'rgba(0,0,0,0.7)',
                top: 0,
                bottom: 0,
                right: 0,
                left: 0,
                padding: '10vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <div css={{background: 'white', maxWidth: 800}}>
                <button onClick={() => onChoose(null)}>Close</button>
                <div
                    css={{
                        width: 20,
                        height: 20,
                        display: 'inline-block',
                        background: hover ? `rgb(${hover.r},${hover.g},${hover.b})` : 'black',
                    }}
                />
                <div css={{maxHeight: 900, overflow: 'auto'}}>
                    {Object.keys(attachments).map((key) => (
                        <div key={key}>
                            <ImageChooser
                                contents={attachments[key].contents}
                                onHover={setHover}
                                onChoose={onChoose}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        portal,
    );
};
