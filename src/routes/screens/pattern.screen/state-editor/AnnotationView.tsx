import {useState, useEffect} from 'react';
import {SpinnerEarring} from '../../../../icons/Icon';
import {ExportAnnotation} from '../ExportHistory';
import {get} from './kv-idb';
import {lsprefix, idbprefix} from './saveAnnotation';

export const anSnapshot = (
    an: ExportAnnotation,
    snapshotUrl: (id: string, ext: string) => string,
) => snapshotUrl(an.id, an.type === 'img' ? 'png' : 'mp4');

export const AnnotationView = ({
    src,
    image,
    size = 100,
}: {
    src: string;
    image: boolean;
    size?: number;
}) => {
    const url = useAnSrc(src);

    if (!url) {
        return (
            <div style={{width: size, height: size}} className="flex items-center justify-center">
                <SpinnerEarring className="animate-spin" />
            </div>
        );
    }
    return image ? (
        <img style={{width: size, height: size}} src={url} />
    ) : (
        <video src={url} style={{width: size, height: size}} />
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
