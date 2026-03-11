import {Rgb} from './Rgb';

export const rgbToString = ({r, g, b}: Rgb) => `rgb(${r},${g},${b})`;
export const toHex = (n: number) => n.toString(16).padStart(2, '0');
export const rgbToHex = ({r, g, b}: Rgb) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;
