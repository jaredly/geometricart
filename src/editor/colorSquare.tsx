export function colorSquare(full: string | undefined, i: number) {
    return (
        <div
            key={i}
            style={{
                width: '1em',
                height: '1em',
                marginBottom: -2,
                backgroundColor: full,
                border: '1px solid white',
                display: 'inline-block',
                marginRight: 8,
            }}
        />
    );
}
