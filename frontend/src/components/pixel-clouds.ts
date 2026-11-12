type Color = readonly [number, number, number];
const DITHER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const LIGHT = {
  sky: [
    [237, 242, 242],
    [231, 238, 240],
    [224, 234, 238],
    [216, 230, 235],
  ],
  cloud: [
    [242, 245, 240],
    [249, 249, 241],
  ],
} satisfies Record<string, Color[]>;

const DARK = {
  sky: [
    [29, 38, 46],
    [31, 42, 51],
    [34, 46, 55],
    [38, 51, 60],
  ],
  cloud: [
    [43, 55, 64],
    [49, 63, 71],
  ],
} satisfies Record<string, Color[]>;

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

/** A limited-palette sky; its base is cached while clouds drift across it. */
export function createPixelClouds(
  width: number,
  height: number,
  dark: boolean,
) {
  const palette = dark ? DARK : LIGHT;
  const base = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const sky = (y / height) * (palette.sky.length - 1);
      const step = sky % 1 > DITHER[(y % 4) * 4 + (x % 4)] / 16 ? 1 : 0;
      const color: Color = palette.sky[Math.min(3, Math.floor(sky) + step)];
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
        const threshold = 0.62;
        if (cloud < threshold) continue;
        const color = palette.cloud[cloud > threshold + 0.1 ? 1 : 0];
        frame.data.set(color, pixel * 4);
      }
    }
    return frame;
  };
}
