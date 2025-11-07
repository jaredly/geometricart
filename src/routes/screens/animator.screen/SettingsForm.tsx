import {Config} from '../animator';
import {State} from './animator.utils';

export function SettingsForm({
    state,
    config,
    setConfig,
}: {
    state: State;
    config: Config;
    setConfig: (c: Config) => void;
}) {
    return (
        <div>
            <div className="flex-wrap flex items-center gap-2">
                <label className="flex gap-4">
                    <input
                        className="range w-40"
                        type="range"
                        min="0"
                        max={state.layers.length - 1}
                        step={0.01}
                        value={config.preview}
                        onChange={(evt) => setConfig({...config, preview: +evt.target.value})}
                    />
                    <div style={{width: '3em', minWidth: '3em'}}>{config.preview.toFixed(2)}</div>
                    {/* <button className="btn" onClick={() => setAnimate(true)}>
                Animate
            </button> */}
                </label>
                <label>
                    {'Zoom: 1:'}
                    <input
                        className="input w-10"
                        type="number"
                        min="0"
                        max="3"
                        step={0.01}
                        value={config.zoom}
                        onChange={(evt) => setConfig({...config, zoom: +evt.target.value})}
                    />
                </label>
                <label className="ml-4">
                    {'LineWidth'}
                    <input
                        className="range w-40 ml-4"
                        type="range"
                        min="0"
                        max="10"
                        step={0.5}
                        value={config.lineWidth}
                        onChange={(evt) => setConfig({...config, lineWidth: +evt.target.value})}
                    />
                    {config.lineWidth.toFixed(2)}
                </label>
                <label className="ml-4">
                    {'Repl'}
                    <input
                        className="range w-40 ml-4"
                        type="range"
                        min="0"
                        max="10"
                        step={1}
                        value={config.repl}
                        onChange={(evt) => setConfig({...config, repl: +evt.target.value})}
                    />
                </label>
                <div>
                    <label className="mx-4">
                        Woven
                        <input
                            type="checkbox"
                            className="checkbox mx-2"
                            disabled={!config.canv}
                            checked={config.showNice && config.canv}
                            onChange={() => setConfig({...config, showNice: !config.showNice})}
                        />
                    </label>
                    <label className="mx-4">
                        Multi
                        <input
                            type="checkbox"
                            className="checkbox mx-2"
                            disabled={!config.canv}
                            checked={config.multi}
                            onChange={() => setConfig({...config, multi: !config.multi})}
                        />
                    </label>
                    <label className="mx-4">
                        Sharp
                        <input
                            type="checkbox"
                            className="checkbox mx-2"
                            disabled={!config.canv}
                            checked={config.sharp}
                            onChange={() => setConfig({...config, sharp: !config.sharp})}
                        />
                    </label>
                </div>
            </div>
        </div>
    );
}
