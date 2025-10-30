import {EditorState} from './Canvas.MenuItem.related';

export type PendingPathPair = [
    EditorState['pending'],
    (
        fn: EditorState['pending'] | ((state: EditorState['pending']) => EditorState['pending']),
    ) => void,
];