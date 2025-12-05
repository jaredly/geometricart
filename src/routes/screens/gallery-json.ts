import {getAllPatterns} from '../db.server';

export async function loader() {
    return getAllPatterns();
}
