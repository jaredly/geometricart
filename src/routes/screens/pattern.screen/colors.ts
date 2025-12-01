import {hslToRgb} from '../../../rendering/colorConvert';
import {Color} from './export-types';

// Some colors now
export const cssColors = [
    {name: 'black', code: '#000000'},
    {name: 'white', code: '#FFFFFF'},
    {name: 'red', code: '#FF0000'},
    {name: 'lime', code: '#00FF00'},
    {name: 'blue', code: '#0000FF'},
    {name: 'yellow', code: '#FFFF00'},
    {name: 'cyan / Aqua', code: '#00FFFF'},
    {name: 'magenta / Fuchsia', code: '#FF00FF'},
    {name: 'silver', code: '#C0C0C0'},
    {name: 'gray', code: '#808080'},
    {name: 'maroon', code: '#800000'},
    {name: 'olive', code: '#808000'},
    {name: 'green', code: '#008000'},
    {name: 'purple', code: '#800080'},
    {name: 'teal', code: '#008080'},
    {name: 'navy', code: '#000080'},
    {name: 'maroon', code: '#800000'},
    {name: 'dark red', code: '#8B0000'},
    {name: 'brown', code: '#A52A2A'},
    {name: 'firebrick', code: '#B22222'},
    {name: 'crimson', code: '#DC143C'},
    {name: 'red', code: '#FF0000'},
    {name: 'tomato', code: '#FF6347'},
    {name: 'coral', code: '#FF7F50'},
    {name: 'indian red', code: '#CD5C5C'},
    {name: 'light coral', code: '#F08080'},
    {name: 'dark salmon', code: '#E9967A'},
    {name: 'salmon', code: '#FA8072'},
    {name: 'light salmon', code: '#FFA07A'},
    {name: 'orange red', code: '#FF4500'},
    {name: 'dark orange', code: '#FF8C00'},
    {name: 'orange', code: '#FFA500'},
    {name: 'gold', code: '#FFD700'},
    {name: 'dark golden rod', code: '#B8860B'},
    {name: 'golden rod', code: '#DAA520'},
    {name: 'pale golden rod', code: '#EEE8AA'},
    {name: 'dark khaki', code: '#BDB76B'},
    {name: 'khaki', code: '#F0E68C'},
    {name: 'olive', code: '#808000'},
    {name: 'yellow', code: '#FFFF00'},
    {name: 'yellow green', code: '#9ACD32'},
    {name: 'dark olive green', code: '#556B2F'},
    {name: 'olive drab', code: '#6B8E23'},
    {name: 'lawn green', code: '#7CFC00'},
    {name: 'chartreuse', code: '#7FFF00'},
    {name: 'green yellow', code: '#ADFF2F'},
    {name: 'dark green', code: '#006400'},
    {name: 'green', code: '#008000'},
    {name: 'forest green', code: '#228B22'},
    {name: 'lime', code: '#00FF00'},
    {name: 'lime green', code: '#32CD32'},
    {name: 'light green', code: '#90EE90'},
    {name: 'pale green', code: '#98FB98'},
    {name: 'dark sea green', code: '#8FBC8F'},
    {name: 'medium spring green', code: '#00FA9A'},
    {name: 'spring green', code: '#00FF7F'},
    {name: 'sea green', code: '#2E8B57'},
    {name: 'medium aqua marine', code: '#66CDAA'},
    {name: 'medium sea green', code: '#3CB371'},
    {name: 'light sea green', code: '#20B2AA'},
    {name: 'dark slate gray', code: '#2F4F4F'},
    {name: 'teal', code: '#008080'},
    {name: 'dark cyan', code: '#008B8B'},
    {name: 'aqua', code: '#00FFFF'},
    {name: 'cyan', code: '#00FFFF'},
    {name: 'light cyan', code: '#E0FFFF'},
    {name: 'dark turquoise', code: '#00CED1'},
    {name: 'turquoise', code: '#40E0D0'},
    {name: 'medium turquoise', code: '#48D1CC'},
    {name: 'pale turquoise', code: '#AFEEEE'},
    {name: 'aqua marine', code: '#7FFFD4'},
    {name: 'powder blue', code: '#B0E0E6'},
    {name: 'cadet blue', code: '#5F9EA0'},
    {name: 'steel blue', code: '#4682B4'},
    {name: 'corn flower blue', code: '#6495ED'},
    {name: 'deep sky blue', code: '#00BFFF'},
    {name: 'dodger blue', code: '#1E90FF'},
    {name: 'light blue', code: '#ADD8E6'},
    {name: 'sky blue', code: '#87CEEB'},
    {name: 'light sky blue', code: '#87CEFA'},
    {name: 'midnight blue', code: '#191970'},
    {name: 'navy', code: '#000080'},
    {name: 'dark blue', code: '#00008B'},
    {name: 'medium blue', code: '#0000CD'},
    {name: 'blue', code: '#0000FF'},
    {name: 'royal blue', code: '#4169E1'},
    {name: 'blue violet', code: '#8A2BE2'},
    {name: 'indigo', code: '#4B0082'},
    {name: 'dark slate blue', code: '#483D8B'},
    {name: 'slate blue', code: '#6A5ACD'},
    {name: 'medium slate blue', code: '#7B68EE'},
    {name: 'medium purple', code: '#9370DB'},
    {name: 'dark magenta', code: '#8B008B'},
    {name: 'dark violet', code: '#9400D3'},
    {name: 'dark orchid', code: '#9932CC'},
    {name: 'medium orchid', code: '#BA55D3'},
    {name: 'purple', code: '#800080'},
    {name: 'thistle', code: '#D8BFD8'},
    {name: 'plum', code: '#DDA0DD'},
    {name: 'violet', code: '#EE82EE'},
    {name: 'magenta / fuchsia', code: '#FF00FF'},
    {name: 'orchid', code: '#DA70D6'},
    {name: 'medium violet red', code: '#C71585'},
    {name: 'pale violet red', code: '#DB7093'},
    {name: 'deep pink', code: '#FF1493'},
    {name: 'hot pink', code: '#FF69B4'},
    {name: 'light pink', code: '#FFB6C1'},
    {name: 'pink', code: '#FFC0CB'},
    {name: 'antique white', code: '#FAEBD7'},
    {name: 'beige', code: '#F5F5DC'},
    {name: 'bisque', code: '#FFE4C4'},
    {name: 'blanched almond', code: '#FFEBCD'},
    {name: 'wheat', code: '#F5DEB3'},
    {name: 'corn silk', code: '#FFF8DC'},
    {name: 'lemon chiffon', code: '#FFFACD'},
    {name: 'light golden rod yellow', code: '#FAFAD2'},
    {name: 'light yellow', code: '#FFFFE0'},
    {name: 'saddle brown', code: '#8B4513'},
    {name: 'sienna', code: '#A0522D'},
    {name: 'chocolate', code: '#D2691E'},
    {name: 'peru', code: '#CD853F'},
    {name: 'sandy brown', code: '#F4A460'},
    {name: 'burly wood', code: '#DEB887'},
    {name: 'tan', code: '#D2B48C'},
    {name: 'rosy brown', code: '#BC8F8F'},
    {name: 'moccasin', code: '#FFE4B5'},
    {name: 'navajo white', code: '#FFDEAD'},
    {name: 'peach puff', code: '#FFDAB9'},
    {name: 'misty rose', code: '#FFE4E1'},
    {name: 'lavender blush', code: '#FFF0F5'},
    {name: 'linen', code: '#FAF0E6'},
    {name: 'old lace', code: '#FDF5E6'},
    {name: 'papaya whip', code: '#FFEFD5'},
    {name: 'sea shell', code: '#FFF5EE'},
    {name: 'mint cream', code: '#F5FFFA'},
    {name: 'slate gray', code: '#708090'},
    {name: 'light slate gray', code: '#778899'},
    {name: 'light steel blue', code: '#B0C4DE'},
    {name: 'lavender', code: '#E6E6FA'},
    {name: 'floral white', code: '#FFFAF0'},
    {name: 'alice blue', code: '#F0F8FF'},
    {name: 'ghost white', code: '#F8F8FF'},
    {name: 'honeydew', code: '#F0FFF0'},
    {name: 'ivory', code: '#FFFFF0'},
    {name: 'azure', code: '#F0FFFF'},
    {name: 'snow', code: '#FFFAFA'},
    {name: 'black', code: '#000000'},
    {name: 'dim gray / dim grey', code: '#696969'},
    {name: 'gray / grey', code: '#808080'},
    {name: 'dark gray / dark grey', code: '#A9A9A9'},
    {name: 'silver', code: '#C0C0C0'},
    {name: 'light gray / light grey', code: '#D3D3D3'},
    {name: 'gainsboro', code: '#DCDCDC'},
    {name: 'white smoke', code: '#F5F5F5'},
    {name: 'white', code: '#FFFFFF'},
];

const colorNames: Record<string, string> = {};
cssColors.forEach((color) => (colorNames[color.name] = color.code));

export type Rgb = {r: number; g: number; b: number};

export const parseHex = (hex: string) => {
    if (hex.length === 4) {
        const r = parseInt(hex.slice(1, 2), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5), 16);
        return {r: r, g: g, b: b};
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5), 16);
    return {r: r, g: g, b: b};
};

const rgbx = /^rgb\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/i;
const rgbax = /^rgba\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/i;
const hslx = /^hsl\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/i;
const hslax = /^hsla\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/i;

export const oneHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
export const hexToString = (r: number, g: number, b: number) =>
    `#${oneHex(r)}${oneHex(g)}${oneHex(b)}`;

export const colorToRgbString = (color: Color): string => {
    if (Array.isArray(color)) {
        return hexToString(...color);
    }
    if ('r' in color) {
        return hexToString(color.r, color.g, color.b);
    }
    const [r, g, b] = hslToRgb(color.h / 360, color.s / 100, color.l / 100);
    return hexToString(r, g, b);
};

export const colorToString = (color: Color): string => {
    if (Array.isArray(color)) {
        return hexToString(...color);
    }
    if (typeof color === 'object' && 'r' in color) {
        return hexToString(color.r, color.g, color.b);
    }
    return `hsl(${color.h},${color.s},${color.l})`;
};

export const parseColor = (color: string): null | Color => {
    color = color.trim();
    if (colorNames[color]) {
        return parseHex(colorNames[color]);
    }
    if (color.startsWith('#')) {
        return parseHex(color);
    }
    let m = color.match(rgbx);
    if (m) {
        return {r: +m[1], g: +m[2], b: +m[3]};
    }
    m = color.match(rgbax);
    if (m) {
        return {r: +m[1], g: +m[2], b: +m[3]};
    }
    m = color.match(hslx);
    if (m) {
        return {h: +m[1], s: +m[2], l: +m[3]};
    }
    m = color.match(hslax);
    if (m) {
        return {h: +m[1], s: +m[2], l: +m[3]};
    }
    return null;
};
