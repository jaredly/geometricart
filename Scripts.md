

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

### Drop in & Decay

```ts
(paths, t, progress) => {
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

  const m = Math.max(0, t * 3.3 - 2);
  sorted.forEach((k, i) => {
    if (i != 0 && i < m * sorted.length) {
      const timeGone = m - i / sorted.length;
      if (timeGone > 0.3) {
        paths[k] = { ...paths[k], hidden: true };
      } else {
        const inset = Math.floor(timeGone * 100 * 10) / 10;
        paths[k] = transformPath(
          modInsets(paths[k], (i) => (i || 0) + inset),
          [
            translationMatrix(
              push(
                { x: 0, y: 0 },
                cache[k].theta + Math.PI,
                timeGone * cache[k].dist
              )
            ),
          ]
        );
      }
    }
  });

  t = progress(t * 1.5);
  const extra = 25;
  const thresh = t * (sorted.length + extra);
  sorted.forEach((k, i) => {
    if (i == 0) return;
    i += extra;
    if (i > thresh) {
      const timeLeft = i / (sorted.length + extra) - t;
      const amt = Math.sqrt(timeLeft);
      // paths[k] = { ...paths[k], hidden: true };
      paths[k] = transformPath(paths[k], [
        translationMatrix(push({ x: 0, y: 0 }, cache[k].theta, amt * 15)),
      ]);
      return;
    }
  });
};
```


# Sweep fills
```ts
(paths, t) => {
  const sweepFills = (t, size, p0, diff, pdiff) => {
    Object.keys(paths).forEach((key) => {
      const center = segmentsCenter(paths[key].segments);
      const d = dist(center, p0);
      const path = paths[key];
      if (d > t * size) {
        paths[key] = {
          ...path,
          style: {
            ...path.style,
            fills: path.style.fills.map((f) => ({
              ...f,
              color: f.color + pdiff,
            })),
          },
        };
        return;
      }
      paths[key] = {
        ...path,
        style: {
          ...path.style,
          fills: path.style.fills.map((f) => ({
            ...f,
            color: f.color + diff,
          })),
        },
      };
    });
  };

  const [i, p] = animationTimer(t, [1, 1, 1, 1]);

  const corners = [
    { x: 5, y: 5 },
    { x: 5, y: -5 },
    { x: -5, y: -5 },
    { x: -5, y: 5 },
  ];

  sweepFills(p, 16, corners[i], (i + 1) % 4, i);

  // do stuff
};

```


# Concentric dots

```ts

(paths, t) => {
  t *= 3;
  Object.keys(paths).forEach((k) => {
    let path = paths[k];
    let inset = insetPath(path, 4 * (1 + Math.floor(t * 2)));
    delete paths[k];

    inset.forEach((path, i) => {
      const at = followPath(path, t % 1);
      const c = segmentsCenter(path.segments);
      const off = { x: c.x - at.x, y: c.y - at.y };
      const r = 0.01;
      const origin = { x: at.x - r, y: at.y };
      const segments = [{ type: "Arc", center: at, to: origin }];
      paths[k + i] = {
        ...paths[k],
        origin,
        segments,
        style: {
          lines: [], // [{ color: "white", width: 0.1 }],

          fills: [
            {
              color: path.style.fills[0].color,
              lighten: path.style.fills[0].lighten,
            },
          ],
          //fills: [{ color: "aqua" }],
        },
      };

      if (true) {
        const at = followPath(path, 1 - (t % 1));
        const c = segmentsCenter(path.segments);
        const off = { x: c.x - at.x, y: c.y - at.y };
        const r = 0.01;
        const origin = { x: at.x - r, y: at.y };
        const segments = [{ type: "Arc", center: at, to: origin }];
        paths[k + "second" + i] = {
          ...paths[k],
          origin,
          segments,
          style: {
            lines: [],
            fills: [
              {
                color: path.style.fills[0].color,
                lighten: path.style.fills[0].lighten,
              },
            ],
            //fills: [{ color: "aqua" }],
          },
        };
      }
    });
  });
};


```