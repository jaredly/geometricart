import {useState} from 'react';
import {Patterns, Ctx, RenderItem} from './evaluate';
import {State, Box, Color} from './export-types';
import {recordVideo} from './recordVideo';
import {Updater} from '../../../json-diff/Updater';
import {BlurInput} from './state-editor/BlurInput';
import {BlurInt} from '../../../editor/Forms';
import {makeContext} from '../../../json-diff/react';
import {useExportState} from './pattern-export';
import {pk} from '../../pk';
import {svgItems} from './resolveMods';
import {useCropCache} from './useCropCache';
import {renderItems} from './renderItems';
import {BaselineDownload} from '../../../icons/Icon';
import {renderToStaticMarkup} from 'react-dom/server';
import {colorToString} from './colors';
import {generateSvgItems} from './SVGCanvas';

/*
ExportSettings:
- png/svg
- svg split ... by z-index? by ... style id?
- by color
- crop to bounds?
*/

type ExportSettings = {
    size: number;
    kind: 'png' | 'svg' | 'mp4';
    svg: {
        split: 'zIndex' | 'color' | null;
        crop: boolean;
    };
    mp4: {
        duration: number;
        t: number;
    };
};

const defaultExportSettings: ExportSettings = {
    size: 500,
    kind: 'png',
    svg: {
        split: null,
        crop: false,
    },
    mp4: {
        duration: 5,
        t: 0,
    },
};

const [ProvideExportCtx, useExportCtx] = makeContext<ExportSettings>('type');

// I want like a global undo/redo hook
// with "priority" and stuff.
// Maybe, when export is /opened/ it gets priority?
// Or ... hmm .... idk I odnt need it.

type ExImage = {url: string; title: string};

const runSVGExport = (
    id: string,
    ex: ExportSettings,
    box: Box,
    items: RenderItem[],
    bg: Color,
    setImages: (up: (v: ExImage[]) => ExImage[]) => void,
) => {
    const lw = box.width / 10;
    const svgItems = generateSvgItems(
        items.filter((i) => i.type === 'path'),
        null,
        lw,
    );

    const text = renderToStaticMarkup(
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${box.x.toFixed(7)} ${box.y.toFixed(7)} ${box.width.toFixed(7)} ${box.height.toFixed(7)}`}
            style={{background: colorToString(bg)}}
            width={ex.size}
            height={ex.size}
        >
            {svgItems}
        </svg>,
    );

    const blob = new Blob([text], {type: 'image/svg+xml'});

    setImages((images) => [
        ...images,
        {url: URL.createObjectURL(blob), title: id + '-' + new Date().toISOString() + '.svg'},
    ]);
};

const runPNGExport = (
    id: string,
    ex: ExportSettings,
    box: Box,
    items: RenderItem[],
    bg: Color,
    setImages: (up: (v: ExImage[]) => ExImage[]) => void,
) => {
    const canvas = new OffscreenCanvas(ex.size, ex.size);
    const surface = pk.MakeWebGLCanvasSurface(canvas)!;

    renderItems(surface, box, items, bg);
    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes(pk.ImageFormat.PNG)!;
    const blob = new Blob([bytes as BlobPart], {type: 'image/png'});

    setImages((images) => [
        ...images,
        {url: URL.createObjectURL(blob), title: id + '-' + new Date().toISOString() + '.png'},
    ]);
    surface.delete();
};

const ButtonSwitch = <T extends string>({
    value,
    values,
    onChange,
}: {
    value: T | null;
    values: T[];
    onChange: (v: T | null) => void;
}) =>
    values.map((name) => (
        <button
            key={name}
            className={'btn ' + (name === value ? 'btn-accent' : '')}
            onClick={() => (name === value ? onChange(null) : onChange(name))}
        >
            {name}
        </button>
    ));

const ExportSettingsForm = ({
    id,
    patterns,
    cropCache,
    state,
    box,
    t,
}: {
    id: string;
    patterns: Patterns;
    cropCache: Ctx['cropCache'];
    state: State;
    box: Box;
    t: number;
}) => {
    const ectx = useExportCtx();
    const settings = ectx.use((v) => v);
    const update = ectx.update;
    const [images, setImages] = useState<ExImage[]>([]);

    return (
        <div className="p-2">
            <label>
                Size:
                <BlurInt
                    value={settings.size}
                    onChange={(v) => (v != null ? update.size(v) : null)}
                    className="input w-20 mx-4"
                />
            </label>
            <ButtonSwitch
                values={['png', 'svg', 'mp4'] as const}
                value={settings.kind}
                onChange={(v) => (v ? update.kind(v) : null)}
            />
            <button
                className="btn btn-accent ml-4"
                onClick={() => {
                    const animCache = new Map();
                    const {items, bg} = svgItems(state, animCache, cropCache, patterns, t);

                    if (settings.kind === 'png') {
                        runPNGExport(id, settings, box, items, bg, setImages);
                    } else if (settings.kind === 'svg') {
                        runSVGExport(id, settings, box, items, bg, setImages);
                    }
                }}
            >
                Export
            </button>
            <div>
                {settings.kind === 'svg' && (
                    <div className="border border-base-100 p-4 rounded bg-base-100 my-4">
                        <label className="p-2">
                            <span className="mr-4">Split?</span>
                            <ButtonSwitch
                                values={['zIndex', 'color'] as const}
                                value={settings.svg.split}
                                onChange={update.svg.split}
                            />
                        </label>
                        <label className="p-2">
                            Crop
                            <input
                                checked={settings.svg.crop}
                                onChange={(evt) => update.svg.crop(evt.target.checked)}
                                className="checkbox mx-2"
                                type="checkbox"
                            />
                        </label>
                    </div>
                )}
            </div>
            <div className="flex flex-col items-start p-4 gap-4">
                {images.map((im, i) => (
                    <div key={i} className="relative group">
                        <img src={im.url} style={{width: 300, height: 300}} />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a className="btn btn-square mr-4" href={im.url} download={im.title}>
                                <BaselineDownload />
                            </a>
                            <button
                                className="btn btn-square"
                                onClick={() => setImages(images.filter((_, j) => j !== i))}
                            >
                                &times;
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export function FrameExport({
    box,
    patterns,
    statusRef,
    cropCache,
    state,
    t,
    id,
}: {
    id: string;
    t: number;
    state: State;
    box: Box;
    statusRef: React.RefObject<HTMLDivElement | null>;
    patterns: Patterns;
    cropCache: Ctx['cropCache'];
}) {
    return (
        <ProvideExportCtx initial={defaultExportSettings}>
            <div>
                <ExportSettingsForm
                    id={id}
                    state={state}
                    t={t}
                    box={box}
                    patterns={patterns}
                    cropCache={cropCache}
                />
            </div>
        </ProvideExportCtx>
    );
}
