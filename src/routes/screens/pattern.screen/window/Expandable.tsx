import {ChevronUp12} from '../../../../icons/Icon';
import {useExpanded} from './state';

export const Expandable = ({
    title,
    children,
    ex,
}: {
    ex: string;
    title: React.ReactNode;
    children: React.ReactNode;
}) => {
    const [expanded, setExpanded] = useExpanded(ex);
    return (
        <div>
            <div
                className="flex items-center cursor-pointer group hover:text-amber-300"
                onClick={(evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    setExpanded(!expanded);
                }}
            >
                <div className="p-2 mr-2 hover:bg-amber-400 hover:text-amber-950 rounded-4xl transition-colors">
                    <ChevronUp12 className={expanded ? 'rotate-180' : 'rotate-90'} />
                </div>
                {title}
            </div>
            {expanded ? <div className="p-2 pl-6">{children}</div> : null}
        </div>
    );
};
