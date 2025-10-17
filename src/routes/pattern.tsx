import {useLoaderData, useParams} from 'react-router';
import {ShowTiling} from '../editor/ShowTiling';
import type {Route} from './+types/pattern';
import {getPattern} from './db.server';

export async function loader({params}: Route.LoaderArgs) {
    if (!params.id) {
        return null;
    }
    return getPattern(params.id);
}

export const Pattern = () => {
    const {id} = useParams();
    const data = useLoaderData<typeof loader>();
    if (!data) {
        return <div>No data... {id}</div>;
    }
    return (
        <div>
            Hello pattern {id}
            <ShowTiling tiling={data.tiling} />
        </div>
    );
};
export default Pattern;
