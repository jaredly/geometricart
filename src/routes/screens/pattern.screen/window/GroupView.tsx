import {ChevronUp12, ObjectUngroup} from '../../../../icons/Icon';
import {Updater} from '../../../../json-diff/Updater';
import {Group, Layer} from '../export-types';
import {orderedIds} from '../state-editor/nextOrder';
import {EntityView} from './EntityView';
import {useExpanded} from './state';

export const GroupView = ({
    value,
    $,
    $$,
}: {
    value: Group;
    $: Updater<Group>;
    $$: Updater<Layer>;
}) => {
    const [expanded, setExpanded] = useExpanded($.toString());
    return (
        <div>
            <div className="flex items-center">
                <div
                    onClick={(evt) => {
                        evt.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    className="p-2 mr-2 hover:bg-amber-400 hover:text-amber-950 rounded-4xl transition-colors"
                >
                    <ChevronUp12 className={expanded ? 'rotate-180' : 'rotate-90'} />
                </div>
                <ObjectUngroup />
                {value.name ?? `Group ${value.id.slice(0, 4)}`}
            </div>
            {expanded ? (
                <div className="p-2 pl-6">
                    {orderedIds(value.entities).map((id) => (
                        <EntityView id={id} $={$$.entities[id]} $$={$$} />
                    ))}
                </div>
            ) : null}
        </div>
    );
};
