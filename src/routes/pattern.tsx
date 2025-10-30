import {useMemo} from 'react';
import {useLoaderData, useParams} from 'react-router';
import type {Route} from './+types/pattern';
import {getPattern} from './db.server';
import {canonicalShape, getPatternData, humanReadableFraction} from './getPatternData';
import {flipPattern} from './flipPattern';
import {TilingPattern} from './ShowTiling';
import {normShape} from './normShape';

export async function loader({params}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
    return getPattern(params.id);
}

export const Pattern = () => {
    const {id} = useParams();
    let pattern = useLoaderData<typeof loader>();

    const tiling = pattern ? flipPattern(pattern.tiling) : null;
    // const tiling = pattern?.tiling;
    const data = useMemo(() => (tiling ? getPatternData(tiling) : null), [tiling]);
    if (!pattern || !tiling || !data || !id) {
        return <div>No data... {id}</div>;
    }

    const canonKeys: Record<string, ReturnType<typeof canonicalShape> & {percentage: number}> = {};
    data.canons.forEach((c) => {
        if (c.percentage) {
            if (!canonKeys[c.key]) {
                canonKeys[c.key] = {...c};
            } else {
                canonKeys[c.key].percentage += c.percentage;
            }
        }
    });

    return (
        <div css={{padding: 10}}>
            Noew {id}
            <div>
                <TilingPattern tiling={tiling} size={1000} data={data} />
                {/* {JSON.stringify(tiling.shape)} */}
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {
                        //data.canons
                        Object.values(canonKeys).map((shape, i) => {
                            const points = normShape(shape.scaled);

                            return (
                                <div key={i}>
                                    <svg
                                        data-key={shape.key}
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="-1 -1 2 2"
                                        style={{
                                            background: 'black',
                                            width: 200,
                                            height: 200,
                                            margin: 5,
                                        }}
                                    >
                                        <path
                                            fill="green"
                                            d={
                                                `M` +
                                                points
                                                    .map(
                                                        ({x, y}) =>
                                                            `${x.toFixed(3)} ${y.toFixed(3)}`,
                                                    )
                                                    .join('L') +
                                                'Z'
                                            }
                                        />
                                    </svg>
                                    <div>{humanReadableFraction(shape.percentage)}</div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </div>
    );
};
export default Pattern;
