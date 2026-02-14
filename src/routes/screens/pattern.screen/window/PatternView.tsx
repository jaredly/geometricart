import {ExternalLinkIcon, CogIcon} from '../../../../icons/Icon';
import {Updater} from '../../../../json-diff/Updater';
import {Pattern} from '../export-types';
import {OrderableEditor} from '../state-editor/PatternEditor';
import {Expandable} from './Expandable';
import {PatternContentsView} from './LayerEditor';
import {PatternPreview} from './PatternPreview';

export const PatternView = ({value, $}: {value: Pattern; $: Updater<Pattern>}) => {
    return (
        <Expandable
            ex={$.toString()}
            title={
                <>
                    <PatternPreview tiling={value.tiling.tiling} />
                    {value.id}
                    <a
                        className="link text-sm mx-4 hover:text-amber-400"
                        target="_blank"
                        href={`/gallery/pattern/${value.tiling.id}`}
                        onClick={(evt) => evt.stopPropagation()}
                    >
                        <ExternalLinkIcon />
                    </a>
                    <div style={{flex: 1}} />
                    <button
                        onClick={(evt) => {
                            evt.stopPropagation();
                        }}
                        className="hidden group-hover:block cursor-pointer hover:text-amber-400"
                    >
                        <CogIcon />
                    </button>
                </>
            }
        >
            <OrderableEditor
                value={value.contents}
                update={$.contents}
                Inner={PatternContentsView}
            />
        </Expandable>
    );
};
