import fs from 'fs';
import path from 'path';
import vm from 'vm';

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo/static/js/element-snap.js'), 'utf8'), context);
const { getElementLowerEdges, snapElementLowerEdges } = context;

test('透明菱形下缘识别两条斜边，矩形底边和全透明图不强行吸附', () => {
  const width = 80;
  const height = 60;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (Math.abs(x + 0.5 - 40) / 40 + Math.abs(y + 0.5 - 35) / 20 <= 1) pixels[(y * width + x) * 4 + 3] = 255;
    }
  }
  const edges = getElementLowerEdges(pixels, width, height, [80, 40]);
  expect(edges.map(edge => edge.slope)).toEqual([-0.5, 0.5]);
  expect(edges.every(edge => edge.to - edge.from > 25)).toBe(true);
  expect(getElementLowerEdges(new Uint8ClampedArray(pixels.length), width, height, [80, 40])).toEqual([]);
  expect(getElementLowerEdges(pixels.fill(255), width, height, [80, 40])).toEqual([]);
  expect(getElementLowerEdges(pixels, width, height, [80, 10])).toEqual([]);
});

test('近边吸附后截距落在半格边线上，双边位移不超容差，缩放使用屏幕距离', () => {
  const edges = [{ slope: -0.5, intercept: 20, from: 0, to: 40 }, { slope: 0.5, intercept: 20, from: 40, to: 80 }];
  const result = snapElementLowerEdges(edges, [2, 3], [0, 0], [80, 40], 1);
  expect(result.edges).toHaveLength(2);
  expect(result.offset[0]).toBeCloseTo(-2);
  expect(result.offset[1]).toBeCloseTo(-3);
  expect(snapElementLowerEdges(edges, [0, 12], [0, 0], [80, 40], 1).edges).toHaveLength(0);
  expect(snapElementLowerEdges(edges, [0, 12], [0, 0], [80, 40], 0.4).edges).toHaveLength(2);
  expect(snapElementLowerEdges([], [0, 0], [0, 0], [80, 40], 1).offset).toEqual([0, 0]);
});
