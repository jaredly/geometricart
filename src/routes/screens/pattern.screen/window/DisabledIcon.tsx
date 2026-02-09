import {useId} from 'react';
import {EyeIcon, EyeInvisibleIcon} from '../../../../icons/Eyes';
import {EyePencilIcon} from '../../../../icons/Icon';
import {Updater} from '../../../../json-diff/Updater';
import {ExpandableEditor} from '../state-editor/ExpandableEditor';

export const DisabledIcon = ({update, value}: {value: string; update: Updater<string>}) => {
    const id = useId();
    return (
        <>
            <button
                popoverTarget={id}
                style={{anchorName: '--' + id} as React.CSSProperties}
                className="cursor-pointer p-2"
                onContextMenu={(evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    document.getElementById(id)?.togglePopover();
                }}
                onClick={(evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (value !== '' && value !== 'true') {
                        document.getElementById(id)?.togglePopover();
                        return;
                    }
                    update.$replace(value ? '' : 'true');
                }}
            >
                {!value ? (
                    <EyeIcon />
                ) : value === 'true' ? (
                    <EyeInvisibleIcon className="text-slate-500" />
                ) : (
                    <EyePencilIcon />
                )}
            </button>
            <div
                className="dropdown menu rounded-box bg-base-100 shadow-sm"
                popover="auto"
                onClick={(evt) => evt.stopPropagation()}
                onKeyDown={(evt) => evt.stopPropagation()}
                onKeyUp={(evt) => evt.stopPropagation()}
                id={id}
                style={
                    {
                        // top: 'anchor()'
                        positionAnchor: '--' + id,
                    } as React.CSSProperties
                }
            >
                <ExpandableEditor value={value + ''} onChange={(v) => update.$replace(v)} />
            </div>
        </>
    );
};
