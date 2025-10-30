import {Fill} from '../types';

export const mergeFills = (one: Fill, two: Fill | null): Fill =>
    !two
        ? one
        : {
              color: two.color != null ? two.color : one.color,
              inset: two.inset != null ? two.inset : one.inset,
              opacity: two.opacity != null ? two.opacity : one.opacity,
              lighten: two.lighten != null ? two.lighten : one.lighten,
          };