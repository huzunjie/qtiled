import fs from 'fs';
import vm from 'vm';
import { pathFinding } from '../src';
import * as maps from '../src/maps';

const read = file => fs.readFileSync(`${__dirname}/../demo/static/${file}`, 'utf8');
const json = file => JSON.parse(read(file));
const elements = { ...json('terrain-samples/emperor-land-water/elements.json'), ...json('terrain-samples/emperor-elevation/elements.json'), ...json('construction-samples/elements.json') };
const rules = json('terrain-samples/emperor-land-water/rules.json');
const heights = json('terrain-samples/emperor-elevation/rules.json');
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps } });
['terrain-sample', 'environment-rules', 'beach-rules', 'land-water-rules', 'elevation-rules', 'construction-rules'].forEach(name => vm.runInContext(read(`js/${name}.js`), context));
const { beachRules: rawBeach, environmentRules: environment, elevationRules: elevation, constructionRules: construction } = context.window;
const beach = { ...rawBeach, applyStroke: (map, grids, erase = false) => rawBeach.applyStroke(map, grids, erase, rules) };
const make = () => ({ version: 2, id: 'beach-test', tileSize: [80, 40], elevationStep: 40, climate: 'temperate', entities: [],
  cells: Array.from({ length: 14 }, () => Array.from({ length: 18 }, () => ({ terrain: 'land', elevation: 8, terrainVariant: 0 }))) });
const resolve = (map, angle = 0) => elevation.resolve(map, elements, rules, heights, angle);
const tileAt = (result, x, y) => result.tiles.find(tile => tile.grid[0] === x && tile.grid[1] === y);

test.each([
  ['草沙直边', 'BBLLLLLB', [748, 742, 744, 746]],
  ['草岛转角', 'BBBBLLLB', [749, 743, 745, 747]],
  ['草沙内角', 'LBLLLLLL', [753, 750, 751, 752]],
])('%s 四镜头使用完整原图', (name, ring, records) => {
  const map = make();
  rules.neighborOffsets.forEach(([dx, dy], i) => { if (ring[i] === 'B') map.cells[6 + dy][6 + dx].beach = true; });
  rules.qtiledCameraColumns.forEach((column, i) => {
    const selected = beach.select(map.cells, 6, 6, column, rules, null, 0);
    expect(selected).toEqual({ record: records[i], kind: 'land-edge', variant: 0 });
    const view = elements[`emperor-beach-${selected.record}`].views[0];
    expect(view.source).toBe('beach-atlas.webp');
    expect(view.rect[2]).toBe(78);
    expect(view.anchor).toEqual([39, view.rect[3] - 20]);
  });
});

test.each(['arid', 'temperate', 'humid'])('%s 平地海滩、四向交界与完整擦除回到原始结果', climate => {
  const map = make(); map.climate = climate;
  const before = JSON.stringify(map);
  const grids = [[6, 5], [7, 5], [6, 6], [7, 6]];
  const drawn = beach.applyStroke(map, grids).definition;
  for (const angle of [0, 90, 180, 270]) {
    const result = resolve(drawn, angle);
    expect(result.issues).toEqual([]);
    expect(tileAt(result, 6, 5).element).toBe('emperor-beach-736');
    expect(tileAt(result, 6, 4).element).toMatch(/^emperor-beach-/);
    expect(resolve(JSON.parse(JSON.stringify(drawn)), angle)).toEqual(result);
    expect(resolve(beach.applyStroke(drawn, grids, true).definition, angle)).toEqual(resolve(map, angle));
  }
  expect(JSON.stringify(map)).toBe(before);
});

test('直岸四向对应原作表的沙岸图片；只改变陆地事实', () => {
  const map = make();
  map.cells.forEach(row => row.forEach((cell, x) => { if (x >= 10) cell.terrain = 'water'; else if (x >= 7) cell.beach = true; }));
  // 西侧三邻格非水，N=0xe0；原表行18偏移[4,0,12,8]，QTiled列[1,0,3,2]。
  const expected = [574, 578, 582, 586];
  [0, 90, 180, 270].forEach((angle, i) => {
    const result = resolve(map, angle); expect(result.issues).toEqual([]);
    expect(tileAt(result, 10, 7).element).toBe(`emperor-beach-${expected[i]}`);
  });
  expect(map.cells[7][10].beach).toBeUndefined();
});

test('海滩加入岩石距离门槛的同一来源集合，移除后恢复', () => {
  const map = make(); map.climate = 'arid'; map.cells[6][0].terrain = 'water'; map.cells[6][6].rock = 'ordinary';
  expect(environment.deriveMoisture(map.cells, map.climate)[6][6]).toBe(0);
  map.cells[6][5].beach = true;
  expect(environment.deriveMoisture(map.cells, map.climate)[6][6]).toBe(100);
  delete map.cells[6][5].beach;
  expect(environment.deriveMoisture(map.cells, map.climate)[6][6]).toBe(0);
});

test.each([{ beach: false }, { beach: true, terrain: 'water' }, { beach: true, road: 'ordinary' }, { beach: true, tree: 'ordinary-mature' }, { beach: true, rock: 'ordinary' }, { beach: true, quarry: true }])('拒绝海滩字段或占用冲突 %j', facts => {
  const map = make(); Object.assign(map.cells[6][6], facts);
  expect(resolve(map).issues.length).toBeGreaterThan(0);
});

test('海滩允许两格内普通高差，仍保护实体及越界落笔', () => {
  const map = beach.applyStroke(make(), [[6, 6]]).definition;
  map.cells[6][8].elevation = 9;
  expect(resolve(map).issues).toEqual([]);
  map.cells[6][8].elevation = 8;
  map.cells[6][7].terrain = 'water';
  expect(beach.applyStroke(map, [[7, 6], [18, 6]]).definition).toBeNull();
  expect(map.cells[6][7].beach).toBeUndefined();
  map.cells[6][7].terrain = 'land';
  map.entities = [{ id: 'house', element: 'courtyard-house', grid: [6, 6], angle: 0 }];
  expect(construction.validate(map, resolve(map).tiles, elements).issues.length).toBeGreaterThan(0);
});

test.each([1, 2])('v%i 水域直接画海滩保留高度，清除回陆地而不修改旁格', version => {
  const map = make(); map.version = version;
  map.cells.forEach(row => row.forEach(cell => { cell.terrain = 'water'; cell.elevation = version === 1 ? 0 : 8; }));
  const before = JSON.stringify(map);
  const painted = beach.applyStroke(map, [[6, 6]]).definition;
  expect(painted.cells[6][6]).toEqual({ terrain: 'land', beach: true, elevation: version === 1 ? 0 : 8, terrainVariant: 0 });
  expect(painted.cells[6][7]).toEqual(map.cells[6][7]);
  for (const angle of [0, 90, 180, 270]) expect(resolve(painted, angle).issues).toEqual([]);
  const cleared = beach.applyStroke(painted, [[6, 6]], true).definition;
  expect(cleared.cells[6][6]).toEqual({ terrain: 'land', elevation: version === 1 ? 0 : 8, terrainVariant: 0 });
  expect(JSON.stringify(map)).toBe(before);
});

test('N09 在落笔预览中整理，读取旧图只报告轮廓问题', () => {
  const original = rawBeach.applyStroke(make(), [[6, 5], [7, 7]]).definition;
  const saved = JSON.stringify(original);
  expect(resolve(original).issues.some(item => item.code === 'beach-shape-needs-adjustment')).toBe(true);
  expect(JSON.stringify(original)).toBe(saved);
  const map = beach.applyStroke(make(), [[6, 5], [7, 7]]).definition;
  expect(map.cells[5][6].beach).toBe(true);
  expect(map.cells[7][7].beach).toBe(true);
  expect(map.cells.flat().filter(cell => cell.beach).length).toBeGreaterThan(2);
  for (const angle of [0, 90, 180, 270]) expect(resolve(map, angle).issues).toEqual([]);
  const missing = { ...elements }; delete missing['emperor-beach-736'];
  expect(elevation.resolve(map, missing, rules, heights).issues.some(item => item.code === 'missing-terrain-element')).toBe(true);
});

test.each([1, 2])('v%i 海滩直接改陆地/水域，保留高度与变体，并可构造四周海滩的草地岛', version => {
  const map = make(); map.version = version;
  map.cells.forEach(row => row.forEach(cell => { cell.beach = true; cell.elevation = version === 1 ? 0 : 8; }));
  const original = JSON.stringify(map);
  const grids = Array.from({ length: 9 }, (_, i) => [6 + i % 3, 5 + Math.floor(i / 3)]);
  for (const terrain of ['land', 'water']) for (const angle of [0, 90, 180, 270]) {
    const result = elevation.applyStroke(map, { terrain, grids }, elements, rules, heights, angle);
    expect(result.issues).toEqual([]);
    for (const [x, y] of grids) expect(result.definition.cells[y][x]).toEqual({ terrain, elevation: version === 1 ? 0 : 8, terrainVariant: 0 });
    expect(result.definition.cells[4][7].beach).toBe(true);
    expect(result.definition.cells[8][7].beach).toBe(true);
    expect(result.definition.cells[6][5].beach).toBe(true);
    expect(result.definition.cells[6][9].beach).toBe(true);
    if (terrain === 'land') {
      expect(tileAt(result, 7, 6).element).toMatch(/^emperor-grass-/);
      expect(tileAt(result, 6, 6).beachKind).toBe('land-edge');
    } else expect(tileAt(result, 6, 6).beachKind).toBe('coast');
  }
  expect(JSON.stringify(map)).toBe(original);
});

test('256种草沙邻域经笔刷整理后，四镜头均不使用水石或合成图', () => {
  for (let mask = 1; mask < 256; mask += 1) {
    const map = make();
    const grids = rules.neighborOffsets.filter((offset, i) => mask & (1 << i)).map(([dx, dy]) => [6 + dx, 6 + dy]);
    const result = beach.applyStroke(map, grids);
    expect(result.issues).toEqual([]);
    for (const [x, y] of grids) expect(result.definition.cells[y][x].beach).toBe(true);
    for (const angle of [0, 90, 180, 270]) {
      const rendered = resolve(result.definition, angle);
      expect(rendered.issues).toEqual([]);
      expect(rendered.tiles.every(tile => !tile.element.startsWith('emperor-beach-')
        || /^emperor-beach-7(?:3[6-9]|4[0-9]|5[0-3])$/.test(tile.element))).toBe(true);
    }
  }
});

test.each([[[7, 6]], [[7, 6], [8, 6], [7, 7], [8, 7]],
  [[5, 6], [6, 6], [7, 6], [8, 6], [9, 6]], [[7, 4], [7, 5], [7, 6], [7, 7], [7, 8]]].map(grids => [grids]))(
  '海滩中草地形状%j逐格整理、截断与清除，保留落笔目标', grids => {
    let map = make(); map.cells.forEach(row => row.forEach(cell => { cell.beach = true; }));
    const before = JSON.stringify(map);
    for (const grid of grids) {
      const result = elevation.applyStroke(map, { terrain: 'land', grids: [grid] }, elements, rules, heights);
      expect(result.issues).toEqual([]); map = result.definition;
    }
    for (const grid of [grids[0], grids[grids.length - 1]]) {
      const trimmed = beach.applyStroke(map, [grid]).definition;
      for (const angle of [0, 90, 180, 270]) {
        const result = resolve(trimmed, angle); expect(result.issues).toEqual([]);
        expect(result.tiles.every(tile => !/^emperor-beach-7(?:5[4-9]|[67]\d)$/.test(tile.element))).toBe(true);
      }
      const restored = beach.applyStroke(trimmed, [grid], true).definition;
      expect(restored.cells[grid[1]][grid[0]].beach).toBeUndefined();
      expect(resolve(restored).issues).toEqual([]);
    }
    const allLand = map.cells.flatMap((row, y) => row.flatMap((cell, x) => cell.beach ? [] : [[x, y]]));
    const cleared = beach.applyStroke(map, allLand).definition;
    expect(JSON.stringify(cleared)).toBe(before);
  },
);


test('平沙地可贴高处湖缘及低侧坡脚，但沙地本格不能承担坡面', () => {
  const map = make();
  map.cells.forEach((row, y) => row.forEach((cell, x) => {
    cell.elevation = x < 7 ? 9 : 8;
    if (x < 7) cell.beach = true;
  }));
  for (const angle of [0, 90, 180, 270]) {
    const result = resolve(map, angle);
    expect(result.issues).toEqual([]);
    expect(tileAt(result, 6, 6).element).toMatch(/^emperor-beach-/);
    expect(tileAt(result, 7, 6).element).toMatch(/^emperor-elevation-/);
    expect(tileAt(result, 8, 6).element).not.toMatch(/^emperor-beach-/);
  }
  map.cells[6][7].beach = true;
  expect(resolve(map).issues).toContainEqual(expect.objectContaining({ code: 'beach-height' }));
});

test('跨高差不派生草沙边缘；草沙整理不跨层扩散', () => {
  const map = make();
  map.cells.forEach(row => row.forEach((cell, x) => { cell.elevation = x < 7 ? 9 : 8; }));
  const edited = beach.applyStroke(map, [[6, 6]]);
  expect(edited.issues).toEqual([]);
  expect(edited.definition.cells.flat().filter(cell => cell.beach).every(cell => cell.elevation === 9)).toBe(true);
  for (const angle of [0, 90, 180, 270]) expect(resolve(edited.definition, angle).issues).toEqual([]);
});

test.each(['ramp', 'halfSlope'])('平沙地可接近%s，真实部件仍完整且四向原图可解析', feature => {
  const map = make(); map.cells.forEach(row => row.forEach((cell, x) => { cell.elevation = x < 7 ? 9 : 8; }));
  map.cells[6][7][feature] = true;
  expect(resolve(map).issues).toEqual([]);
  const edited = construction.applySurfaceStroke(map, 'beach', [[9, 7]], elements, rules, heights);
  expect(edited.issues).toEqual([]); expect(edited.definition.cells[7][9].beach).toBe(true);
  expect(edited.definition.cells[6][7][feature]).toBe(true);
  for (const angle of [0, 90, 180, 270]) {
    const result = resolve(edited.definition, angle); expect(result.issues).toEqual([]);
    expect(tileAt(result, 7, 6).slope).toBe(true);
    expect(tileAt(result, 9, 7).element).toMatch(/^emperor-beach-/);
    if (feature === 'halfSlope') expect(tileAt(result, 8, 6).halfSlope).toBe(true);
  }
  expect(map.cells[7][9].beach).toBeUndefined();
});

test('海滩区域升降后只把实际坡面恢复为普通岸地，保留高处与远处平沙地', () => {
  const map = make(); map.cells.flat().forEach(cell => { cell.beach = true; });
  const edited = elevation.applyStroke(map, { type: 'raise', grids: [[6, 6]] }, elements, rules, heights);
  expect(edited.issues).toEqual([]);
  expect(edited.definition.cells[6][6]).toMatchObject({ beach: true, elevation: 9 });
  expect(edited.definition.cells[6][7].beach).toBeUndefined();
  expect(edited.definition.cells[12][16].beach).toBe(true);
  for (const angle of [0, 90, 180, 270]) expect(resolve(edited.definition, angle).issues).toEqual([]);
});
