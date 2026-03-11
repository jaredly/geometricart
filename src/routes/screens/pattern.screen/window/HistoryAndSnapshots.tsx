import {HistoryView} from '../state-editor/HistoryView';
import {SnapshotAnnotations} from '../state-editor/SnapshotAnnotations';

export const HistoryAndSnapshots = () => {
    return (
        <div>
            <SnapshotAnnotations />
            <HistoryView />
        </div>
    );
};
