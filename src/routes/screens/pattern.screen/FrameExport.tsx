import {useState} from 'react';
import {BlurInt} from '../../../editor/Forms';
import {BaselineDownload} from '../../../icons/Icon';
import {makeContext} from '../../../json-diff/react';
import {Ctx} from './evaluate';
import {Box} from './export-types';
import {useExportState} from './ExportHistory';
import {WorkerSend} from './render-client';
import {runPNGExport, runSVGExport} from './runPNGExport';
import {saveAnnotation} from './state-editor/saveAnnotation';
import {State} from './types/state-type';

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

const [ProvideExportConfig, useExportConfig] = makeContext<ExportSettings>('type');

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
    namePrefix,
    worker,
    cropCache,
    state,
    box,
    t,
    snapshotUrl,
}: {
    snapshotUrl: (id: string, ext: string) => string;
    namePrefix: string;
    worker: WorkerSend;
    cropCache: Ctx['cropCache'];
    state: State;
    box: Box;
    t: number;
}) => {
    const ectx = useExportConfig();
    const settings = ectx.use((v) => v);
    const update = ectx.update;
    const [images, setImages] = useState<ExImage[]>([]);

    const ctx = useExportState();

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
                    worker({type: 'frame', state, t}, (res) => {
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

                        if (settings.kind === 'png' || settings.kind === 'svg') {
                            // make a small one
                            const small = runPNGExport(200, box, items, bg);
                            saveAnnotation(snapshotUrl, small, ctx.tip(), ctx.updateAnnotations);
                        }

                        if (blob) {
                            setImages((images) => [
                                ...images,
                                {
                                    url: URL.createObjectURL(blob),
                                    title:
                                        namePrefix +
                                        '-' +
                                        new Date().toISOString() +
                                        '.' +
                                        settings.kind,
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
    statusRef,
    cropCache,
    worker,
    state,
    t,
    namePrefix,
    snapshotUrl,
}: {
    snapshotUrl: (id: string, ext: string) => string;
    box: Box;
    t: number;
    namePrefix: string;
    state: State;
    worker: WorkerSend;
    statusRef: React.RefObject<HTMLDivElement | null>;
    cropCache: Ctx['cropCache'];
}) {
    return (
        <ProvideExportConfig initial={defaultExportSettings}>
            <div>
                <ExportSettingsForm
                    snapshotUrl={snapshotUrl}
                    namePrefix={namePrefix}
                    state={state}
                    worker={worker}
                    t={t}
                    box={box}
                    cropCache={cropCache}
                />
            </div>
        </ProvideExportConfig>
    );
}
