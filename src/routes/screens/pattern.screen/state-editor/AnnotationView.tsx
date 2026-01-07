import {useEffect, useRef, useState} from 'react';
import {BaselinePlayArrow, OutlinePlayArrow, SpinnerEarring} from '../../../../icons/Icon';
import {ExportAnnotation} from '../ExportHistory';
import db from './kv-idb';
import {makeSnapshotUrl, SnapshotUrl} from './saveAnnotation';

export const anSnapshot = (an: ExportAnnotation, snapshotUrl: SnapshotUrl): AnSrc =>
    snapshotUrl.type === 'idb'
        ? {type: 'idb', id: snapshotUrl.id, aid: an.id}
        : {
              type: 'url',
              url: makeSnapshotUrl(snapshotUrl, an.id, an.type === 'img' ? 'png' : 'mp4'),
          };

export const AnnotationView = ({
    src,
    image,
    size = 100,
}: {
    src: AnSrc;
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
        <AutoplayVideo src={url} style={{width: size, height: size}} loop />
    );
};

const AutoplayVideo = (props: React.ComponentProps<'video'>) => {
    const ref = useRef<HTMLVideoElement>(null);

    return (
        <div
            style={{position: 'relative'}}
            onMouseOverCapture={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                ref.current?.play();
            }}
            onMouseLeave={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                ref.current?.pause();
            }}
        >
            <video {...props} ref={ref} />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 50,
                    color: 'white',
                }}
                className="group hover:hidden"
            >
                <OutlinePlayArrow className="group-hover:hidden" />
            </div>
        </div>
    );
};

export type AnSrc = {type: 'idb'; id: string; aid: string} | {type: 'url'; url: string};

const useAnSrc = (src: AnSrc) => {
    const [url, setUrl] = useState(src.type === 'idb' ? null : src.url);
    useEffect(() => {
        let toRelease: null | string = null;
        if (src.type === 'idb') {
            db.get('snapshots', [src.id, src.aid]).then((blob) => {
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
