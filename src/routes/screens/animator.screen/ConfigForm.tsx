import React from 'react';
import {BlurInt} from '../../../editor/Forms';
import {GeometryInner} from '../../../threed/pathToGeometryMid';
import {TConfig} from './SVGExports';

export function ConfigForm({
    tconfig,
    setTConfig,
    svgs,
    svStep,
    rotate,
    setRotate,
}: {
    tconfig: TConfig;
    setTConfig: React.Dispatch<React.SetStateAction<TConfig>>;
    svgs: {svg: string; geom: GeometryInner[]; zoom: number}[];
    svStep: number;
    rotate: boolean;
    setRotate: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    return (
        <>
            <label className="m-4">
                {'Thick: '}
                <BlurInt
                    className="input w-20"
                    step={0.01}
                    value={tconfig.thick}
                    onChange={(value) =>
                        value != null ? setTConfig({...tconfig, thick: value}) : null
                    }
                />
            </label>
            <label className="m-4">
                {'Gap: '}
                <BlurInt
                    className="input w-20"
                    step={0.01}
                    value={tconfig.gap}
                    onChange={(value) =>
                        value != null ? setTConfig({...tconfig, gap: value}) : null
                    }
                />
            </label>
            <label className="m-4">
                {'Size: '}
                <BlurInt
                    className="input w-20"
                    step={50}
                    value={tconfig.size}
                    onChange={(value) =>
                        value != null ? setTConfig({...tconfig, size: value}) : null
                    }
                />
            </label>
            <button
                className="btn"
                onClick={() => {
                    let m = 0;
                    const step = () => {
                        setTConfig({...tconfig, mm: [tconfig.mm[0], m++]});
                        // setMax(m++);
                        if (m < svgs.length + 1) {
                            setTimeout(step, (m - 2) % Math.round(1 / svStep) === 0 ? 1600 : 400);
                        }
                    };
                    step();
                }}
            >
                Animate Max
            </button>
            <div>
                <label className="m-2">
                    {'Min: '}
                    <BlurInt
                        className="input w-10"
                        step={1}
                        value={tconfig.mm[0]}
                        onChange={(value) =>
                            value != null
                                ? setTConfig({...tconfig, mm: [value, tconfig.mm[1]]})
                                : null
                        }
                    />
                </label>
                <label className="m-2">
                    {'Max: '}
                    <BlurInt
                        className="input w-10"
                        step={1}
                        value={tconfig.mm[1]}
                        onChange={(value) =>
                            value != null
                                ? setTConfig({...tconfig, mm: [tconfig.mm[0], value]})
                                : null
                        }
                    />
                </label>
                <label className="m-2">
                    {'Reverse: '}
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={tconfig.rev}
                        onChange={() => setTConfig({...tconfig, rev: !tconfig.rev})}
                    />
                </label>
                <button
                    className={`btn ` + (rotate ? 'btn-accent' : '')}
                    onClick={() => setRotate(!rotate)}
                >
                    Rotate
                </button>
                <label className="m-2">
                    {'Tscale: '}
                    <BlurInt
                        className="input w-20"
                        step={1}
                        value={tconfig.tscale}
                        onChange={(value) =>
                            value != null ? setTConfig({...tconfig, tscale: value}) : null
                        }
                    />
                </label>
            </div>
        </>
    );
}
