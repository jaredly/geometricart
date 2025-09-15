import * as React from 'react';
import localforage from 'localforage';
import dayjs from 'dayjs';
import {Button} from 'primereact/button';
import {confirmPopup, ConfirmPopup} from 'primereact/confirmpopup';
import {MetaData, keyPrefix, metaPrefix, updateMeta, key, meta, thumbPrefix} from './run';
import {Tiling} from './types';
import {eigenShapesToSvg, getTransform, tilingPoints} from './editor/tilingPoints';
import {applyMatrices} from './rendering/getMirrorTransforms';

export function tilingCacheSvg(cache: Tiling['cache'], shape: Tiling['shape']) {
    const pts = tilingPoints(shape);
    const tx = getTransform(pts);
    return (
        <img
            style={{width: 200}}
            src={`data:image/svg+xml,${eigenShapesToSvg(
                cache.segments.map((s) => [s.prev, s.segment.to]),
                shape,
                applyMatrices(pts[2], tx),
                pts.map((pt) => applyMatrices(pt, tx)),
            )}`}
        />
    );
}

export const DesignLoader = () => {
    const [designs, setDesigns] = React.useState<MetaData[]>([]);
    React.useEffect(() => {
        localforage
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k.startsWith(keyPrefix))
                        .map((k) => localforage.getItem<MetaData>(metaPrefix + k)),
                ),
            )
            .then((metas) =>
                setDesigns(
                    (metas.filter(Boolean) as MetaData[]).sort((a, b) => b.updatedAt - a.updatedAt),
                ),
            );
    }, []);
    const [tick, setTick] = React.useState(0);
    React.useEffect(() => {
        const iv = setInterval(() => setTick(tick + 1), 1000 * 60);
        return () => clearInterval(iv);
    });
    return (
        <div className="flex flex-row flex-wrap p-3">
            {designs.map((design) => (
                <div
                    key={design.id}
                    // style={{ width: 300, height: 300 }}
                    onClick={() => {
                        updateMeta(design.id, {openedAt: Date.now()}).then(() => {
                            window.location.hash = '/' + design.id;
                        });
                    }}
                    className="hover:surface-hover surface-base p-4 cursor-pointer"
                >
                    <div style={{flex: 1}}>
                        <ThumbLoader id={design.id} />
                        {(design.tilings?.length &&
                            design.tilings[0].cache &&
                            design.tilings?.map((tiling) => (
                                <div key={tiling.cache.hash}>
                                    <div>{tiling.cache.hash.slice(0, 10)}</div>
                                    {tilingCacheSvg(tiling.cache, tiling.shape)}
                                </div>
                            ))) ?? <div style={{color: 'red'}}>No tilings</div>}
                        <div>{dayjs(design.updatedAt).from(dayjs())}</div>
                        <div className="flex flex-row justify-content-between">
                            {mb(design.size)}
                            <div>
                                <Button
                                    onClick={(evt) => {
                                        evt.stopPropagation();
                                        const popup = confirmPopup({
                                            target: evt.currentTarget,
                                            message: 'Are you sure you want to delete this design?',
                                            icon: 'pi pi-exclamation-triangle',
                                            accept: () => {
                                                setDesigns(
                                                    designs.filter((d) => d.id !== design.id),
                                                );
                                                localforage.removeItem(key(design.id));
                                                localforage.removeItem(meta(design.id));
                                                localforage.removeItem(
                                                    thumbPrefix + key(design.id),
                                                );
                                            },
                                            reject: () => {},
                                        });
                                        console.log(popup);
                                        popup.show();
                                    }}
                                    icon="pi pi-trash"
                                    className=" p-button-sm p-button-text p-button-danger"
                                    style={{marginTop: -5, marginBottom: -6}}
                                />
                            </div>
                        </div>
                    </div>
                    <div></div>
                </div>
            ))}
            <ConfirmPopup />
        </div>
    );
};
const ThumbLoader = ({id}: {id: string}) => {
    const [data, setData] = React.useState(null as null | string);
    React.useEffect(() => {
        localforage
            .getItem<Blob>(thumbPrefix + key(id))
            .then((blob) => (blob ? setData(URL.createObjectURL(blob)) : null));
    }, [id]);
    return data ? <img src={data} width={200} height={200} /> : null;
};
const mb = (n: number) =>
    n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(2) + 'mb' : (n / 1024).toFixed(0) + 'kb';
