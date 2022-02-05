

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


## Spin appear

```ts

(paths, t) => {
  const cache = {};
  Object.keys(paths).forEach((k) => {
    const [d, c] = farthestPoint({ x: 0, y: 0 }, paths[k].segments);
    // const d = dist({ x: 0, y: 0 }, c);
    const theta = angleTo({ x: 0, y: 0 }, c);
    cache[k] = { center: c, dist: d, theta };
  });
  const sorted = Object.keys(paths).sort((a, b) => {
    const diff = cache[a].dist - cache[b].dist;
    return Math.abs(diff) < 0.01 ? cache[a].theta - cache[b].theta : diff;
  });
  sorted.forEach((k, i) => {
    if (i > t * sorted.length) {
      paths[k] = { ...paths[k], hidden: true };
      return;
    }
  });
};

```

## Spin drop in, so fun

```ts

(paths, t) => {
  const cache = {};
  Object.keys(paths).forEach((k) => {
    const [d, c] = farthestPoint({ x: 0, y: 0 }, paths[k].segments);
    const theta = angleTo({ x: 0, y: 0 }, c);
    cache[k] = { center: c, dist: d, theta };
  });
  const sorted = Object.keys(paths).sort((a, b) => {
    const diff = cache[a].dist - cache[b].dist;
    return Math.abs(diff) < 0.01 ? cache[a].theta - cache[b].theta : diff;
  });
  const thresh = t * sorted.length * 1.1;
  sorted.forEach((k, i) => {
    if (i > thresh) {
      const timeLeft = i / (sorted.length * 1.1) - t;
      const amt = Math.sqrt(timeLeft);
      paths[k] = transformPath(paths[k], [
        translationMatrix(push({ x: 0, y: 0 }, cache[k].theta, amt * 15)),
      ]);
      return;
    }
  });
};

```

With acceleration

```ts

(paths, t, progress) => {
  const cache = {};
  Object.keys(paths).forEach((k) => {
    const [d, c] = farthestPoint({ x: 0, y: 0 }, paths[k].segments);
    const theta = angleTo({ x: 0, y: 0 }, c);
    cache[k] = { center: c, dist: d, theta };
  });
  const sorted = Object.keys(paths).sort((a, b) => {
    const diff = cache[a].dist - cache[b].dist;
    return Math.abs(diff) < 0.01 ? cache[a].theta - cache[b].theta : diff;
  });
  t = progress(t * 1.1);
  const thresh = t * sorted.length * 1.1;
  sorted.forEach((k, i) => {
    if (i > thresh) {
      const timeLeft = i / (sorted.length * 1.1) - t;
      const amt = Math.sqrt(timeLeft);
      paths[k] = transformPath(paths[k], [
        translationMatrix(push({ x: 0, y: 0 }, cache[k].theta, amt * 15)),
      ]);
      return;
    }
  });
};

```