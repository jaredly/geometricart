import {PathGroup} from '../types';

export function groupSort(a: PathGroup, b: PathGroup): number {
    return a.ordering == b.ordering
        ? 0
        : a.ordering == null
          ? b.ordering == null
              ? 0
              : b.ordering >= 0
                ? 1
                : -1
          : b.ordering == null
            ? a.ordering >= 0
                ? -1
                : 1
            : b.ordering - a.ordering;
}