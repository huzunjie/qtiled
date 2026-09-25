import { shapes } from '../src';

const { rotateSelectionOffsets, getBounds } = shapes.polygon;
const rectangle = (w, h) => Array.from({ length: w * h }, (_, i) => [Math.floor(i / h), i % h]);

describe('选区旋转和焦点锚定', () => {
  test('空集合、默认参数、单格与输入不变', () => {
    expect(rotateSelectionOffsets()).toEqual([]);
    const offsets = Object.freeze([Object.freeze([8, -4])]);
    expect(rotateSelectionOffsets(offsets)).toEqual([[0, 0]]);
    expect(offsets).toEqual([[8, -4]]);
  });
  test.each([
    [0, 1, -1, 3, 0], [1, 2, -2, 3, 0],
    [2, 1, -2, 3, -1], [3, 1, -2, 2, 0],
  ])('3×2 的 %i 方向保持焦点 (2,-1)', (turns, minX, minY, maxX, maxY) => {
    const grids = shapes.rect.getNeighborsByOffsets([2, -1], rotateSelectionOffsets(rectangle(3, 2), turns));
    expect(getBounds(grids)).toMatchObject({ minX, minY, maxX, maxY });
    expect(grids).toContainEqual([2, -1]);
  });
  test('L 形保留格子顺序及旋转方向，负角度与多圈归一化', () => {
    const l = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
    expect(rotateSelectionOffsets(l, 1)).toEqual([[1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]);
    expect(rotateSelectionOffsets(l, -1)).toEqual(rotateSelectionOffsets(l, 3));
    expect(rotateSelectionOffsets(l, 5)).toEqual(rotateSelectionOffsets(l, 1));
    expect(rotateSelectionOffsets(l, 4)).toEqual(l);
  });
  test('1～7 奇偶宽高及负坐标，形状不丢格、不变形且整体平移不影响结果', () => {
    for (let w = 1; w <= 7; w++) for (let h = 1; h <= 7; h++) {
      const original = rectangle(w, h);
      for (let turns = 0; turns < 4; turns++) {
        const result = rotateSelectionOffsets(original, turns);
        expect(result).toEqual(rotateSelectionOffsets(original.map(([x, y]) => [x - 20, y - 17]), turns));
        expect(new Set(result.map(String)).size).toBe(w * h);
        const bounds = getBounds(result);
        expect([bounds.width, bounds.height]).toEqual(turns % 2 ? [h - 1, w - 1] : [w - 1, h - 1]);
        expect(result.flat().every(Number.isInteger)).toBe(true);
        expect(result.flat().some(n => Object.is(n, -0))).toBe(false);
      }
      expect(rotateSelectionOffsets(original, 4)).toEqual(rotateSelectionOffsets(original, 0));
    }
  });
});

describe('自定义偏移映射', () => {
  test('矩形、等距默认值、平移和输入不变', () => {
    const offsets = Object.freeze([Object.freeze([-1, 2]), Object.freeze([0, 0])]);
    for (const query of [shapes.rect.getNeighborsByOffsets, shapes.rhombus.getIsometricNeighborsByOffsets]) {
      expect(query()).toEqual([]);
      expect(query([3, -2], offsets)).toEqual([[2, 0], [3, -2]]);
    }
    expect(shapes.rhombus.getNeighborsByOffsets()).toEqual([]);
  });
  test.each(['odd', 'even'])('错列 %s 跨奇偶行及负下标，与等距像素偏移一致', stagger => {
    const offsets = [[-2, 1], [1, 0], [0, -1], [0, 0], [2, -2]];
    for (let y = -3; y <= 3; y++) {
      const origin = [-2, y];
      const base = shapes.rhombus.getPosition(origin, [60, 30], stagger);
      const grids = shapes.rhombus.getNeighborsByOffsets(origin, offsets, stagger);
      grids.forEach((grid, i) => {
        const pos = shapes.rhombus.getPosition(grid, [60, 30], stagger);
        expect([pos[0] - base[0], pos[1] - base[1]]).toEqual(shapes.rhombus.getIsometricPosition(offsets[i], [60, 30]));
      });
      const distance = shapes.rhombus.getNeighborsByDistance(origin, 2, (x, dy) => offsets.some(p => p[0] === x && p[1] === dy) && [x, dy], stagger);
      expect(new Set(grids.map(String))).toEqual(new Set(distance.map(String)));
    }
  });
});
