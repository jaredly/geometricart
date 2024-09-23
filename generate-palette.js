function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0'); // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

const count = 20;

const colors = [];
for (let i = 0; i < count; i++) {
    // const h = (360 / count) * i;
    // colors.push(hslToHex(h, 100, 50));
    const one = (((i / count) * 256) | 0).toString(16).padStart(2, '0');
    colors.push(`#${one}${one}${one}`);
}
console.log(colors.join(','));
