import fs from 'fs';
import path from 'path';
import vm from 'vm';

const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo/static/js/square-groups.js'), 'utf8'), context);
const group = context.window.groupSquareTiles;
const tiles = () => Array.from({ length: 9 }, (_, i) => ({ grid: [i % 3, Math.floor(i / 3)], elevation: 8, rock: 'ordinary' }));
const summary = groups => groups.map(({ tile, size }) => [...tile.grid, size]);

test('扫描顺序固定、优先大块、保留类别边界且不修改输入', () => {
  const input = tiles().reverse();
  input[0].rock = 'copper';
  const before = JSON.stringify(input);
  expect(summary(group(input, 'rock', [3, 2, 1]))).toEqual([[0, 0, 2], [2, 0, 1], [2, 1, 1], [0, 2, 1], [1, 2, 1], [2, 2, 1]]);
  expect(JSON.stringify(input)).toBe(before);
});

test('不同高度、空缺和已有归属都阻止跨格组合', () => {
  const input = tiles();
  input[0].elevation = 9;
  input[4].rockOwner = [1, 1];
  input.splice(8, 1);
  const groups = group(input, 'rock', [3, 2, 1]);
  expect(groups).toHaveLength(7);
  expect(groups.every(item => item.size === 1)).toBe(true);
  expect(groups.some(item => item.tile === input[4])).toBe(false);
});

test('尺寸上限由调用方决定，空集合不生成分组', () => {
  expect(summary(group(tiles(), 'rock', [3, 2, 1]))).toEqual([[0, 0, 3]]);
  expect(summary(group(tiles(), 'rock', [2, 1]))).toEqual([[0, 0, 2], [2, 0, 1], [2, 1, 1], [0, 2, 1], [1, 2, 1], [2, 2, 1]]);
  expect(group([], 'rock', [2, 1])).toEqual([]);
});
