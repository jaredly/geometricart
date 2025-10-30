
export function getPalettesFromFile(
    // palettes: { [key: string]: string[] },
    // dispatch: (action: Action) => void,
    file: File,
    done: (palettes: {[key: string]: Array<string>}) => void,
) {
    const reader = new FileReader();
    reader.onload = () => {
        const text = reader.result as string;
        if (typeof text !== 'string') {
            return;
        }
        const last = text.trim().split('\n').slice(-1)[0];
        if (!last.startsWith(`<!-- PALETTES:`) || !last.endsWith(`-->`)) {
            return;
        }
        const data = JSON.parse(last.slice(`<!-- PALETTES:`.length, -'-->'.length));
        done(data);
    };
    reader.readAsText(file);
}