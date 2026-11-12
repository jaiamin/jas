type Color = readonly [number, number, number];
type Point = readonly [number, number];

const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const CONTINENTS: readonly (readonly Point[])[] = [
  [
    [-168, 72],
    [-135, 70],
    [-115, 75],
    [-78, 60],
    [-52, 52],
    [-66, 45],
    [-83, 25],
    [-98, 16],
    [-108, 28],
    [-120, 36],
    [-128, 51],
    [-151, 60],
  ],
  [
    [-80, 12],
    [-65, 10],
    [-51, 3],
    [-35, -8],
    [-47, -24],
    [-54, -39],
    [-69, -55],
    [-75, -38],
    [-80, -10],
  ],
  [
    [-55, 83],
    [-20, 78],
    [-38, 60],
    [-60, 61],
  ],
  [
    [-17, 34],
    [7, 37],
    [34, 31],
    [52, 12],
    [42, -14],
    [28, -35],
    [17, -34],
    [10, -5],
    [-6, 5],
    [-17, 16],
  ],
  [
    [-10, 36],
    [-10, 60],
    [10, 71],
    [50, 70],
    [100, 76],
    [165, 66],
    [145, 45],
    [125, 20],
    [107, 8],
    [78, 8],
    [55, 28],
    [32, 41],
    [15, 38],
  ],
];

const LIGHT = {
  sky: [
    [237, 242, 242],
    [231, 238, 240],
    [224, 234, 238],
    [216, 230, 235],
  ],
  sea: [
    [172, 195, 204],
    [185, 206, 212],
    [201, 218, 221],
  ],
  land: [
    [182, 199, 179],
    [198, 210, 187],
    [215, 222, 202],
  ],
  cloud: [
    [242, 245, 240],
    [249, 249, 241],
  ],
  planetCloud: [
    [218, 229, 224],
    [230, 237, 227],
  ],
} satisfies Record<string, Color[]>;

const DARK = {
  sky: [
    [29, 38, 46],
    [31, 42, 51],
    [34, 46, 55],
    [38, 51, 60],
  ],
  sea: [
    [43, 65, 80],
    [51, 77, 90],
    [63, 91, 101],
  ],
  land: [
    [58, 78, 68],
    [71, 91, 76],
    [88, 105, 85],
  ],
  cloud: [
    [43, 55, 64],
    [49, 63, 71],
  ],
  planetCloud: [
    [82, 104, 107],
    [101, 119, 115],
  ],
} satisfies Record<string, Color[]>;

function inside(
  longitude: number,
  latitude: number,
  polygon: readonly Point[],
) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, y] = polygon[i];
    const [previousX, previousY] = polygon[j];
    if (
      y > latitude !== previousY > latitude &&
      longitude < ((previousX - x) * (latitude - y)) / (previousY - y) + x
    )
      result = !result;
  }
  return result;
}

function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const hash = (a: number, b: number) => {
    let value = Math.imul(a, 374761393) ^ Math.imul(b, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (value: number) => value * value * (3 - 2 * value);
  const u = smooth(x - ix);
  const v = smooth(y - iy);
  const top = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u;
  const bottom = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return top * (1 - v) + bottom * v;
}

/** A limited-palette illustration; the fixed globe is cached, only clouds move. */
export function createPixelEarth(width: number, height: number, dark: boolean) {
  const palette = dark ? DARK : LIGHT;
  const base = new Uint8ClampedArray(width * height * 4);
  const planet = new Uint8Array(width * height);
  const radius = Math.min(height * 0.38, width * 0.21);
  const centerX = width * 0.76;
  const centerY = height * 0.42;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const sky = (y / height) * (palette.sky.length - 1);
      const step = sky % 1 > DITHER[(y % 4) * 4 + (x % 4)] / 16 ? 1 : 0;
      let color: Color = palette.sky[Math.min(3, Math.floor(sky) + step)];
      const u = (x - centerX) / radius;
      const v = (y - centerY) / radius;
      const distance = u * u + v * v;
      if (distance < 1) {
        planet[pixel] = 1;
        const depth = Math.sqrt(1 - distance);
        const longitude = (Math.atan2(u, depth) * 180) / Math.PI - 28;
        const latitude = (Math.asin(-v) * 180) / Math.PI;
        const land = CONTINENTS.some((polygon) =>
          inside(longitude, latitude, polygon),
        );
        const shade = Math.max(
          0,
          Math.min(2, Math.floor((depth * 0.65 - u * 0.35 + 0.25) * 3)),
        );
        color = (land ? palette.land : palette.sea)[shade];
      }
      base.set([...color, 255], pixel * 4);
    }
  }

  return (offset: number) => {
    const frame = new ImageData(new Uint8ClampedArray(base), width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = y * width + x;
        const drift = x + offset;
        const cloud =
          noise(drift / 24, y / 6) * 0.65 + noise(drift / 9, y / 3) * 0.35;
        const threshold = planet[pixel] ? 0.72 : 0.62;
        if (cloud < threshold) continue;
        const color = (planet[pixel] ? palette.planetCloud : palette.cloud)[
          cloud > threshold + 0.1 ? 1 : 0
        ];
        frame.data.set(color, pixel * 4);
      }
    }
    return frame;
  };
}
