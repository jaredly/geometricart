import {useState} from 'react';
import {Patterns, Ctx} from './evaluate';
import {State, Box} from './export-types';
import {recordVideo} from './recordVideo';
import {Updater} from '../../../json-diff/Updater';
import {BlurInput} from './state-editor/BlurInput';
import {BlurInt} from '../../../editor/Forms';
import {makeContext} from '../../../json-diff/react';
import {useExportState} from './ExportHistory';
import {svgItems} from './resolveMods';
import {useCropCache} from './useCropCache';
import {BaselineDownload} from '../../../icons/Icon';
import {WorkerSend} from './render-client';
import {runPNGExport, runSVGExport} from './runPNGExport';

/*
ExportSettings:
- png/svg
- svg split ... by z-index? by ... style id?
- by color
- crop to bounds?
*/

export type ExportSettings = {
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
    worker,
    patterns,
    cropCache,
    state,
    box,
    t,
}: {
    id: string;
    worker: WorkerSend;
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
                    worker({type: 'frame', state, patterns, t}, (res) => {
                        if (res.type !== 'frame') {
                            return;
                        }
                        const {items, bg} = res;
                        const blob =
                            settings.kind === 'png'
                                ? runPNGExport(settings.size, box, items, bg)
                                : settings.kind === 'svg'
                                  ? runSVGExport(settings, box, items, bg)
                                  : null;

                        if (blob) {
                            setImages((images) => [
                                ...images,
                                {
                                    url: URL.createObjectURL(blob),
                                    title: id + '-' + new Date().toISOString() + '.svg',
                                },
                            ]);
                        }
                    });
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
    worker,
    state,
    t,
    id,
}: {
    box: Box;
    t: number;
    id: string;
    state: State;
    worker: WorkerSend;
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
                    worker={worker}
                    t={t}
                    box={box}
                    patterns={patterns}
                    cropCache={cropCache}
                />
            </div>
        </ProvideExportCtx>
    );
}
