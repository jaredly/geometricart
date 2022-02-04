

ok
```ts
// spin goes out and back
// bump is the kernel 0000125210000

(paths, t, spin, bump) => {
  // t = (t * 3) % 1;
  t = Math.abs(0.5 - t) * 2;
  Object.keys(paths).forEach((key) => {
    const path = paths[key];
    const center = segmentsCenter(path.segments);
    let d = dist(center, { x: 0, y: 0 });
    let max = 20;

    const i = (spin(t) * Math.PI) / 3;

    const middle = 0;

    const dm = d / 7 + 0.5; // + 0.8;
    //const inset = 8 + 30 * bump(Math.min(1, d / (t * 7)));
    const z = dm - t;
    const inset = 12 + 30 * bump(Math.min(0.8, Math.max(z, 0)));
    // (5 - i) * 2 + 10; // (Math.sin(t * Math.PI * 2) + 1) * d + 10;
    paths[key] = {
      ...path,
      style: {
        fills: [
          {
            ...path.style.fills[0],
            //color: `hsl(200, 100%, ${100 - d * 10}%)`,
            lighten: 10 - d - 5,
            colorVariation: 0,
            inset,
          },
        ],
        lines: [
          {
            ...path.style.lines[0],
            //color: `hsl(200, 100%, ${100 - d * 10}%)`,
            inset: inset - 8,
          },
          //{ color: "white", width: 1, inset: 0 },
        ],
      },
    };
  });
};

```
