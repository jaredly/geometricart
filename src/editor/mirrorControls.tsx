import React from 'react';
import {PendingMirror} from '../useUIState';
import {AddIcon, CancelIcon, IconButton, MirrorIcon, SubtractLineIcon} from '../icons/Icon';

export function mirrorControls(
    setPendingMirror: (
        fn: PendingMirror | ((m: PendingMirror | null) => PendingMirror | null) | null,
    ) => void,
    pendingMirror: PendingMirror,
): React.ReactElement {
    return (
        <div>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => setPendingMirror(null)}
            >
                <CancelIcon />
            </IconButton>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => {
                    setPendingMirror((mirror) =>
                        mirror
                            ? {
                                  ...mirror,
                                  rotations: mirror.rotations + 1,
                              }
                            : null,
                    );
                }}
            >
                <AddIcon />
            </IconButton>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => {
                    setPendingMirror((mirror) =>
                        mirror
                            ? {
                                  ...mirror,
                                  rotations: Math.max(1, mirror.rotations - 1),
                              }
                            : null,
                    );
                }}
            >
                <SubtractLineIcon />
            </IconButton>
            <IconButton
                css={{
                    fontSize: 40,
                }}
                onClick={() => {
                    setPendingMirror((mirror) =>
                        mirror
                            ? {
                                  ...mirror,
                                  reflect: !mirror.reflect,
                              }
                            : null,
                    );
                }}
                selected={pendingMirror.reflect}
            >
                <MirrorIcon />
            </IconButton>
        </div>
    );
}