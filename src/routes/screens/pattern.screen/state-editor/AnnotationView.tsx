import {useState, useEffect} from 'react';
import {SpinnerEarring} from '../../../../icons/Icon';
import {ExportAnnotation} from '../ExportHistory';
import {get} from './kv-idb';
import {lsprefix, idbprefix} from './saveAnnotation';

export const AnnotationView = ({
    an,
    snapshotUrl,
}: {
    an: ExportAnnotation;
    snapshotUrl: (id: string, ext: string) => string;
}) => {
    const url = useAnSrc(snapshotUrl(an.id, an.type === 'img' ? 'png' : 'mp4'));

    if (!url) {
        return (
            <div style={{width: 100, height: 100}} className="flex items-center justify-center">
                <SpinnerEarring className="animate-spin" />
            </div>
        );
    }
    return an.type === 'img' ? (
        <img style={{width: 100, height: 100}} src={url} />
    ) : (
        <video src={url} style={{width: 100, height: 100}} />
    );
};
const useAnSrc = (src: string) => {
    const [url, setUrl] = useState(
        src.startsWith(lsprefix)
            ? localStorage[src.slice(lsprefix.length)]
            : src.startsWith(idbprefix)
              ? null
              : src,
    );
    useEffect(() => {
        let toRelease: null | string = null;
        if (src.startsWith(idbprefix)) {
            get(src.slice(idbprefix.length)).then((blob) => {
                if (!blob) {
                    console.log('nothing there', src);
                    return;
                }
                toRelease = URL.createObjectURL(blob);
                setUrl(toRelease);
            });
        }
        return () => URL.revokeObjectURL(toRelease!);
    }, [src]);

    return url;
};
