import * as core from '../src';
import { rotateGridPoint } from '../src/shapes/polygon';
import { projectGrid, pickGrid } from '../src/isometric-view';

describe('固定原点旋转', () => {
  test('默认值及零次旋转保留原位置，返回新数组', () => {
    expect(rotateGridPoint()).toEqual([0, 0]);
    const grid = Object.freeze([8, -4]);
    expect(rotateGridPoint(grid)).toEqual([8, -4]);
    expect(rotateGridPoint(grid)).not.toBe(grid);
  });

  test.each([
    [0, [2, -1]], [1, [1, 2]], [2, [-2, 1]], [3, [-1, -2]],
    [4, [2, -1]], [-1, [-1, -2]], [-5, [-1, -2]], [9, [1, 2]],
  ])('累计 %i 次的方向', (turns, expected) => {
    expect(rotateGridPoint([2, -1], turns)).toEqual(expected);
  });

  test('连续四次复原，正反变换一致，原点不产生负零', () => {
    for (const grid of [[0, 0], [-3, 2], [0.25, -1.5]]) {
      let rotated = grid;
      for (let turns = 0; turns < 4; turns++) rotated = rotateGridPoint(rotated, 1);
      expect(rotated).toEqual(grid);
      for (let turns = -5; turns <= 5; turns++) {
        expect(rotateGridPoint(rotateGridPoint(grid, turns), -turns)).toEqual(grid);
        expect(rotateGridPoint([0, -0], turns)).toEqual([0, 0]);
      }
    }
  });
});

describe('四向平地视图', () => {
  test('默认参数与部分视图参数', () => {
    expect(projectGrid()).toEqual([0, 0]);
    expect(pickGrid()).toEqual([0, 0]);
    expect(projectGrid([1, 0])).toEqual([4, -2]);
    expect(projectGrid([1, 0], { angle: 90 })).toEqual([4, 2]);
    expect(pickGrid([4, 2], { angle: 90 })).toEqual([1, 0]);
    expect(projectGrid(undefined, { originPixel: [-5, 3] })).toEqual([-5, 3]);
  });

  test.each([
    [0, [410, 215]], [90, [470, 275]], [180, [350, 305]], [270, [290, 245]],
  ])('%i 度投影符合明确像素坐标并可反查', (angle, pixel) => {
    const view = { angle, tileSize: [60, 30], originPixel: [380, 260] };
    expect(projectGrid([2, -1], view)).toEqual(pixel);
    expect(pickGrid(pixel, view)).toEqual([2, -1]);
    expect(projectGrid([0, 0], view)).toEqual([380, 260]);
  });

  test.each([0, 90, 180, 270])('%i 度的负坐标、不同尺寸与格内点往返一致', angle => {
    for (const tileSize of [[60, 30], [72, 48], [81.5, 39.25]]) {
      const view = { angle, tileSize, originPixel: [-101.25, 37.5] };
      for (let x = -4; x <= 4; x++) for (let y = -3; y <= 3; y++) {
        for (const [dx, dy] of [[0, 0], [0.49, 0.49], [-0.49, -0.49], [0.49, -0.49], [-0.49, 0.49]]) {
          const pixel = projectGrid([x + dx, y + dy], view);
          expect(pickGrid(pixel, view)).toEqual([x, y]);
        }
      }
    }
  });

  test('共边沿用既有反查舍入，不改变边界规则', () => {
    expect(pickGrid([15, -7.5], { tileSize: [60, 30] })).toEqual([1, 0]);
    expect(pickGrid([-15, 7.5], { tileSize: [60, 30] })).toEqual([0, 0]);
  });

  test.each([1, 45, -90, 360, '90', null, NaN, Infinity])('拒绝非法视图角度 %p', angle => {
    expect(() => projectGrid([0, 0], { angle })).toThrow(RangeError);
    expect(() => pickGrid([0, 0], { angle })).toThrow(RangeError);
  });

  test('角落原点的非正方形占地及负偏移占地切向后不变', () => {
    const origin = Object.freeze([-2, -1]);
    for (const offsets of [
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
      [[-1, -1], [-1, 0], [-1, 1], [0, 1]],
    ]) {
      const footprint = Object.freeze(offsets.map(point => Object.freeze(point)));
      const before = JSON.stringify(footprint);
      const cells = core.shapes.rhombus.getIsometricNeighborsByOffsets(origin, footprint);
      for (const angle of [0, 90, 180, 270]) {
        const view = Object.freeze({ angle, tileSize: Object.freeze([60, 30]), originPixel: Object.freeze([380, 260]) });
        const pixels = cells.map(grid => projectGrid(Object.freeze(grid), view));
        expect(pixels.map(pixel => pickGrid(Object.freeze(pixel), view))).toEqual(cells);
      }
      expect(JSON.stringify(footprint)).toBe(before);
    }
  });

  test('核心导出仅增加纯旋转函数，不包含可选视图入口', () => {
    expect(core.shapes.polygon.rotateGridPoint).toBe(rotateGridPoint);
    expect(Object.keys(core).sort()).toEqual(['pathFinding', 'shapes']);
    expect(core.shapes.rhombus.projectGrid).toBeUndefined();
    expect(core.shapes.rhombus.pickGrid).toBeUndefined();
  });
});
