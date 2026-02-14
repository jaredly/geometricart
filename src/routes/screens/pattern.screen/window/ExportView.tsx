import {useState, useEffect} from 'react';
import {BlurInt} from '../../../../editor/Forms';
import {useValue} from '../../../../json-diff/react';
import {Updater} from '../../../../json-diff/Updater';
import {useExportState} from '../ExportHistory';
import {State} from '../types/state-type';
import {usePendingState} from '../utils/editState';
import {useGlobalDependencies} from './GlobalDependencies';
import {SpinnerEarring} from '../../../../icons/Icon';

export const ExportView = ({path}: {path: Updater<State['exports']['']>}) => {
    const value = useValue(path);
    const {worker} = useGlobalDependencies();
    const ctx = useExportState();
    const state = useValue(ctx.$);
    const [snapshot, setSnapshot] = useState<null | string>(null);
    const [loading, setLoading] = useState(false);
    const pendingContext = usePendingState();

    useEffect(() => {
        setLoading(true);
        worker(
            {
                type: 'snapshot',
                state,
                config: value.config,
            },
            (result) => {
                if (result.type !== 'snapshot') {
                    return;
                }
                setLoading(false);
                setSnapshot(URL.createObjectURL(result.blob));
            },
        );
    }, [value, state, worker]);
    if (value.config.type === '3d') {
        return <h1>3DDD</h1>;
    }
    return (
        <div className="flex flex-col gap-4">
            <div>
                <label className="mr-4">
                    Scale:
                    <BlurInt
                        className="ml-4"
                        value={value.config.scale}
                        onChange={(scale) =>
                            scale != null ? path.config.$variant('2d').scale(scale) : null
                        }
                    />
                </label>
                <button
                    className="btn"
                    onClick={() => {
                        pendingContext.$.pending.$replace({
                            type: 'rect',
                            points: [],
                            startCenter: true,
                            onDone(box) {
                                path.config.$variant('2d').box(box);
                            },
                        });
                    }}
                >
                    Change shape
                </button>
            </div>
            <div className="relative self-start">
                {snapshot ? <img src={snapshot} width={300} /> : null}
                {loading && (
                    <div className="absolute inset-0 opacity-10 bg-black flex items-center justify-center">
                        <SpinnerEarring className="animate-spin text-9xl" />
                    </div>
                )}
            </div>
        </div>
    );
};
