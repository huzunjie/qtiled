import fs from 'fs';
import vm from 'vm';
import * as maps from '../src/maps';
const read = path => fs.readFileSync(`${__dirname}/../demo/static/${path}`, 'utf8');
const elements = JSON.parse(read('terrain-samples/emperor-land-water/elements.json'));
const context = vm.createContext({ window: {} });
['terrain-sample', 'environment-rules', 'land-water-rules', 'quarry-rules'].forEach(name => vm.runInContext(read(`js/${name}.js`), context));
const quarry = context.window.quarryRules;
const makeMap = () => ({ version: 2, id: 'quarry', tileSize: [80, 40], elevationStep: 40,
  cells: Array.from({ length: 20 }, () => Array.from({ length: 24 }, () => ({ terrain: 'land', elevation: 8, terrainVariant: 0 }))), entities: [] });
// 保留旧样本的非对称 6×6 夹具，用于轮廓回归；不是产品笔刷限制。
const brush = (x, y) => Array.from({ length: 36 }, (_, i) => [x + i % 6 - 3, y + Math.floor(i / 6) - 2]);
const resolve = (map, angle = 0, occupancy = new Map(), catalog = elements) => quarry.resolve(map,
  map.cells.flatMap((row, y) => row.map((cell, x) => cell && ({ grid: [x, y], elevation: cell.elevation, element: 'emperor-bare-land' })).filter(Boolean)), catalog, occupancy, angle);
const paint = (map, x, y, erase) => quarry.applyStroke(map, brush(x, y), erase).definition;
const count = map => map.cells.flat().filter(c => c?.quarry).length;

test('自定义36格足迹，邻接重叠和局部删除不创建实体、不修改地面高度', () => {
  const original = makeMap(); const first = paint(original, 8, 8);
  expect(count(original)).toBe(0); expect(count(first)).toBe(36);
  expect(first.cells[6][5].quarry).toBe(true); expect(first.cells[11][10].quarry).toBe(true);
  const adjacent = paint(first, 14, 8); expect(count(adjacent)).toBe(72);
  const overlap = paint(first, 11, 10); expect(count(overlap)).toBe(60);
  const notch = paint(overlap, 13, 12, true); expect(count(notch)).toBe(44);
  const removed = paint(overlap, 8, 8, true); expect(count(removed)).toBe(24);
  for (const map of [first, adjacent, overlap, notch, removed]) {
    expect(map.entities).toEqual([]);
    for (const angle of [0, 90, 180, 270]) expect(resolve(map, angle).issues).toEqual([]);
    expect(map.cells.flat().every(c => c.elevation === 8 && c.terrain === 'land')).toBe(true);
  }
});

test('四向、稳定外观和真实JSON序列化不改变范围或选图', () => {
  const map = paint(makeMap(), 8, 8);
  const saved = maps.exportMapDefinition(JSON.parse(JSON.stringify(map)), elements); expect(saved.issues).toEqual([]);
  const restored = maps.importMapDefinition(saved.json, elements); expect(restored.issues).toEqual([]);
  for (const angle of [0, 90, 180, 270]) {
    expect(resolve(restored.definition, angle)).toEqual(resolve(map, angle));
    const picked = resolve(map, angle).tiles.filter(t => t.quarry);
    expect(picked).toHaveLength(36);
    expect(picked.every(t => elements[t.element].views[angle].source
      === (t.element.startsWith('emperor-bare-land') ? 'grass-atlas.webp' : 'quarry-atlas.webp'))).toBe(true);
  }
});

test.each(['road', 'tree', 'rock', 'water', 'height', 'entity', 'invalid'])('%s冲突保留原图，导入同样拒绝', kind => {
  const map = paint(makeMap(), 8, 8); const cell = map.cells[8][8];
  const occupancy = new Map();
  if (kind === 'road') cell.road = 'ordinary';
  if (kind === 'tree') cell.tree = 'ordinary-mature';
  if (kind === 'rock') cell.rock = 'iron';
  if (kind === 'water') cell.terrain = 'water';
  if (kind === 'height') cell.elevation++;
  if (kind === 'entity') occupancy.set('8,8', ['house']);
  if (kind === 'invalid') cell.quarry = false;
  const before = JSON.stringify(map); expect(resolve(map, 0, occupancy).issues.length).toBeGreaterThan(0);
  expect(JSON.stringify(map)).toBe(before);
});

test('越界、空角拒绝，跨高度由最终地形判断，零碎边格显示黄土，缺图仍拒绝', () => {
  const map = makeMap();
  expect(quarry.applyStroke(map, brush(1, 1)).issues[0].code).toBe('quarry-outside');
  map.cells[8][8] = null; expect(quarry.applyStroke(map, brush(8, 8)).issues[0].code).toBe('quarry-outside');
  const painted = paint(makeMap(), 8, 8);
  expect(resolve(painted, 0, new Map(), {}).issues.some(i => i.code === 'missing-quarry-element')).toBe(true);
  const bad = makeMap(); bad.cells[8][8].quarry = true;
  // 原外表未匹配取反mask10：仅东北、东南缺失。
  [[0,-1],[1,0],[0,1],[-1,1],[-1,0],[-1,-1]].forEach(([dx,dy]) => { bad.cells[8+dy][8+dx].quarry = true; });
  expect(resolve(bad).issues).toEqual([]);
  expect(resolve(bad).tiles.find(tile => tile.grid.join(',') === '8,8').element).toMatch(/^emperor-bare-land/);
  const heights = makeMap(); heights.cells[8][8].elevation = 9;
  const candidate = quarry.applyStroke(heights, brush(8, 8));
  expect(candidate.issues).toEqual([]);
  expect(resolve(candidate.definition).issues.some(item => item.code === 'quarry-ground')).toBe(true);
});


test.each([[0, 1084, 1072], [90, 1072, 1076], [180, 1076, 1080], [270, 1080, 1084]])('原表静态证据：%i度中心与邻格选图编号', (angle, left, center) => {
  const picked = resolve(paint(makeMap(), 8, 8), angle).tiles;
  const at = (x, y) => picked.find(tile => tile.grid[0] === x && tile.grid[1] === y).element;
  expect(at(7, 8)).toBe(`emperor-quarry-${left}`);
  expect(at(8, 8)).toBe(`emperor-quarry-${center}`);
  expect(at(5, 6)).toBe('emperor-bare-land');
});

test('采石地外圈与普通地表共享全部八种黄土定义，无重复采石黄土', () => {
  const rules = JSON.parse(read('terrain-samples/emperor-land-water/rules.json'));
  expect(rules.landVariants).toHaveLength(8);
  for (let i = 0; i < 8; i++) {
    const map = paint(makeMap(), 8, 8);
    map.cells[6][5].terrainVariant = i;
    const tile = resolve(map).tiles.find(t => t.grid[0] === 5 && t.grid[1] === 6);
    expect(tile.element).toBe(rules.landVariants[i]);
    expect(elements[tile.element].views[0].source).toBe('grass-atlas.webp');
    expect(elements).not.toHaveProperty(`emperor-quarry-${247 + i}`);
  }
});


test('同一笔可绘制互不相连的不同高度平台，不自动抹平地形', () => {
  const map = makeMap();
  for (let y = 0; y < 20; y++) for (let x = 13; x < 24; x++) map.cells[y][x].elevation = 10;
  const grids = [...brush(6, 8), ...brush(18, 8)];
  const result = quarry.applyStroke(map, grids);
  expect(result.issues).toEqual([]);
  expect(count(result.definition)).toBe(72);
  for (const angle of [0, 90, 180, 270]) expect(resolve(result.definition, angle).issues).toEqual([]);
  result.definition.cells.forEach((row, y) => row.forEach((cell, x) => expect(cell.elevation).toBe(map.cells[y][x].elevation)));
});


test('全部256种边邻域可局部编辑，四向有合法原图且不改变采石格事实', () => {
  const neighbors = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  for (let mask = 0; mask < 256; mask++) {
    const map = makeMap(); map.cells[8][8].quarry = true;
    neighbors.forEach(([dx, dy], i) => { if (mask & (1 << i)) map.cells[8 + dy][8 + dx].quarry = true; });
    const before = JSON.stringify(map);
    for (const angle of [0, 90, 180, 270]) {
      const result = resolve(map, angle); expect(result.issues).toEqual([]);
      expect(elements[result.tiles.find(tile => tile.grid.join(',') === '8,8').element]).toBeDefined();
    }
    expect(JSON.stringify(map)).toBe(before);
  }
});
