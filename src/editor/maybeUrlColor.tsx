export const maybeUrlColor = (color: string) =>
    color.startsWith('http') ? `url("${color}")` : color;
