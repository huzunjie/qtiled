import fs from 'fs';
import vm from 'vm';
import { pathFinding } from '../src';
import * as maps from '../src/maps';

const read = path => fs.readFileSync(`${__dirname}/../${path}`, 'utf8');
const json = path => JSON.parse(read(`demo/static/${path}`));
const elements = { ...json('terrain-samples/emperor-land-water/elements.json'),
  ...json('terrain-samples/emperor-elevation/elements.json'), ...json('construction-samples/elements.json') };
const rules = json('terrain-samples/emperor-land-water/rules.json');
const heights = json('terrain-samples/emperor-elevation/rules.json');
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps } });
['terrain-sample', 'environment-rules', 'land-water-rules', 'elevation-rules', 'tree-rules'].forEach(name => vm.runInContext(read(`demo/static/js/${name}.js`), context));
const { landWaterRules: ground, elevationRules: elevation, treeRules: trees } = context.window;
const environment = map => context.window.environmentRules.deriveMoisture(map.cells, map.climate);
const kind = 'ordinary-mature';
const makeMap = (size = 13) => ({ version: 2, id: 'trees', tileSize: [80, 40], elevationStep: 40, climate: 'arid',
  cells: Array.from({ length: size }, () => Array.from({ length: size }, () => ({ terrain: 'land', elevation: 8 }))), entities: [] });
const tiles = (map, angle = 0) => elevation.resolve(map, elements, rules, heights, angle).tiles;
const resolve = (map, angle = 0) => trees.resolve(map, tiles(map, angle), elements, maps.buildMapOccupancy(map, elements).index);
const at = (result, x, y) => result.find(tile => tile.grid[0] === x && tile.grid[1] === y);

test.each(['ordinary-mature', 'bamboo-mature', 'ordinary-stump', 'bamboo-stump'])('%s孤立源四邻50递减，擦除恢复、四镜头和IO一致', kind => {
  const map = makeMap();
  const before = tiles(map);
  map.cells[6][6].tree = kind;
  const expected = tiles(map);
  for (let d = 0; d <= 5; d++) expect(at(expected, 6 + d, 6).moisture).toBe(Math.max(0, 50 - d * 10));
  expect(at(expected, 7, 7).moisture).toBe(30);
  const text = maps.exportMapDefinition(map, elements).json;
  const restored = maps.importMapDefinition(text, elements).definition;
  [0, 90, 180, 270].forEach(angle => {
    expect(resolve(restored, angle).issues).toEqual([]);
    expect(resolve(restored, angle).tiles).toEqual(resolve(map).tiles);
  });
  const erased = trees.applyStroke(map, [[6, 6]], true, environment(map)).definition;
  expect(tiles(erased)).toEqual(before);
  expect(erased.cells[6][6]).toEqual({ terrain: 'land', elevation: 8 });
  expect(map.cells[6][6].tree).toBe(kind);
});

test.each(['ordinary-mature', 'bamboo-mature', 'ordinary-stump', 'bamboo-stump'].flatMap(kind => ['arid', 'temperate', 'humid'].map(climate => [kind, climate])))('%s水树合并不相加，删除来源按%s气候重建', (kind, climate) => {
  const map = makeMap(75);
  map.climate = climate;
  map.cells[35][1].terrain = 'water';
  const water = tiles(map);
  map.cells[35][70].tree = kind;
  const merged = tiles(map);
  expect(at(merged, 70, 35).moisture).toBe(50);
  expect(at(merged, 1, 35).moisture).toBe(100);
  // 水源近处强于50，树源应被跳过；等于50处仍不相加。
  map.cells[35][2].tree = kind;
  map.cells[35][71].tree = kind;
  expect(at(tiles(map), 2, 35).moisture).toBe(at(water, 2, 35).moisture);
  expect(at(tiles(map), 71, 35).moisture).toBe(50);
  delete map.cells[35][70].tree;
  delete map.cells[35][71].tree;
  delete map.cells[35][2].tree;
  expect(tiles(map)).toEqual(water);
  map.cells[35][1].terrain = 'land';
  map.cells[35][70].tree = kind;
  expect(at(tiles(map), 70, 35).moisture).toBe(50);
  expect(at(tiles(map), 1, 35).moisture).toBe(0);
});

test('等值继续传播，null只作中间位置，界外不绕到下一行', () => {
  const map = makeMap(13);
  map.cells[6][0].terrain = 'water';
  // 干旱水源在x=6/7处U=50/40；x=7树源50传播到(7,7)时遇等值40。
  map.cells[6][7].tree = kind;
  expect(at(tiles(map), 8, 7).moisture).toBe(30);
  map.cells[6][0].terrain = 'land';
  map.cells[6][8] = null;
  expect(at(tiles(map), 9, 6).moisture).toBe(30);
  delete map.cells[6][7].tree;
  map.cells[0][12].tree = kind;
  expect(at(tiles(map), 0, 1).moisture).toBe(0);
});

test('邻域八格全有树才选936；缺任一格、空角、边界均选927', () => {
  const map = makeMap(3);
  map.cells.flat().forEach(cell => { cell.tree = kind; cell.terrainVariant = 0; });
  expect(at(resolve(map).tiles, 1, 1).element).toBe('emperor-tree-936');
  expect(at(resolve(map).tiles, 0, 0).element).toBe('emperor-tree-927');
  for (const [x, y] of [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]) {
    delete map.cells[y][x].tree;
    expect(at(resolve(map).tiles, 1, 1).element).toBe('emperor-tree-927');
    map.cells[y][x].tree = kind;
  }
  map.cells[0][0] = null;
  expect(at(resolve(map).tiles, 1, 1).element).toBe('emperor-tree-927');
});

test('树类别不接受数组或对象隐式转成名称，原型键也不能成为类别', () => {
  for (const kind of [['ordinary-mature'], {}, null, 'toString', '__proto__']) {
    const map = makeMap();
    const original = JSON.stringify(map);
    expect(trees.applyStroke(map, [[6, 6]], false, environment(map), kind).issues[0].code).toBe('unsupported-tree');
    expect(JSON.stringify(map)).toBe(original);
    map.cells[6][6].tree = kind;
    expect(elevation.resolve(map, elements, rules, heights, 0).issues[0].code).toBe('invalid-tree');
  }
});

test('整笔冻结已有草地资格；无效尾格不部分修改；重复与擦空格无变化', () => {
  const map = makeMap(); map.cells[6][0].terrain = 'water';
  const original = JSON.stringify(map);
  expect(trees.applyStroke(map, [[10, 6], [11, 6]], false, environment(map)).issues[0].code).toBe('tree-grass');
  expect(trees.applyStroke(map, [[2, 6], [-1, 6]], false, environment(map)).issues[0].code).toBe('tree-outside');
  expect(JSON.stringify(map)).toBe(original);
  const placed = trees.applyStroke(map, [[10, 6], [10, 6]], false, environment(map)).definition;
  expect(placed.cells[6][10].tree).toBe(kind);
  expect(trees.applyStroke(placed, [[10, 6]], false, environment(placed)).definition).toEqual(placed);
  expect(trees.applyStroke(map, [[3, 3]], true, environment(map)).definition).toEqual(map);
});

test.each(['ordinary-mature', 'bamboo-mature', 'ordinary-stump', 'bamboo-stump'])('%s水路实体冲突和非法事实拒绝；未明气候不能自选', kind => {
  for (const conflict of ['water', 'road', 'building', 'invalid', 'climate']) {
    const map = makeMap(); map.cells[6][6].tree = kind;
    if (conflict === 'water') map.cells[6][6].terrain = 'water';
    if (conflict === 'road') map.cells[6][6].road = 'ordinary';
    if (conflict === 'building') map.entities.push({ id: 'house', element: 'courtyard-house', grid: [5, 5], angle: 0 });
    if (conflict === 'invalid') map.cells[6][6].tree = 'bamboo';
    if (conflict === 'climate') delete map.climate;
    const groundResult = elevation.resolve(map, elements, rules, heights);
    const issues = groundResult.issues.length ? groundResult.issues : resolve(map).issues;
    expect(issues.length).toBeGreaterThan(0);
  }
});

test.each(['ordinary-mature', 'bamboo-mature', 'ordinary-stump', 'bamboo-stump'])('%s坡道半坡两部分拒绝，混种样本四向解析', kind => {
  const map = json('map-samples/slope-features-map.json');
  const groundTiles = tiles(map);
  for (const tile of groundTiles.filter(tile => tile.slope)) {
    const copy = JSON.parse(JSON.stringify(map));
    copy.cells[tile.grid[1]][tile.grid[0]].tree = kind;
    expect(resolve(copy).issues.some(error => error.code === 'tree-ground')).toBe(true);
  }
  const sample = json('map-samples/tree-map.json');
  for (const angle of [0, 90, 180, 270]) expect(resolve(sample, angle).issues).toEqual([]);
});


test.each([['ordinary-mature', 927], ['bamboo-mature', 945]])('%s十八外观组内稳定，镜头、IO和重画不变', (kind, base) => {
  const map = makeMap(5);
  map.cells.flat().forEach(cell => { cell.tree = kind; });
  for (let variant = 0; variant < 9; variant++) {
    map.cells[2][2].terrainVariant = variant;
    const surrounded = at(resolve(map).tiles, 2, 2);
    expect(surrounded.element).toBe(`emperor-tree-${base + 9 + variant}`);
    const frame = elements[surrounded.element].views[0];
    expect(frame.source).toBe('trees-atlas.webp');
    delete map.cells[1][1].tree;
    expect(at(resolve(map).tiles, 2, 2).element).toBe(`emperor-tree-${base + variant}`);
    map.cells[1][1].tree = kind;
  }
  delete map.cells[2][2].terrainVariant;
  const expected = resolve(map).tiles;
  const restored = maps.importMapDefinition(maps.exportMapDefinition(map, elements).json, elements).definition;
  [0, 90, 180, 270].forEach(angle => expect(resolve(restored, angle).tiles).toEqual(expected));
  const erased = trees.applyStroke(map, [[2, 2]], true, environment(map)).definition;
  const repainted = trees.applyStroke(erased, [[2, 2]], false, environment(erased), kind).definition;
  expect(resolve(repainted).tiles).toEqual(expected);
  expect(new Set(expected.map(tile => tile.variant)).size).toBeGreaterThan(1);
});


test('混种八邻按共同树标志包围；类别切换不改环境；异类覆盖整笔失败', () => {
  const map = makeMap(5); map.cells.flat().forEach(c => { c.tree = kind; c.terrainVariant = 0; });
  const moisture = tiles(map).map(t => t.moisture);
  map.cells[1][1].tree = 'bamboo-mature';
  expect(at(resolve(map).tiles, 2, 2).element).toBe('emperor-tree-936');
  map.cells[2][2].tree = 'bamboo-mature';
  expect(at(resolve(map).tiles, 2, 2).element).toBe('emperor-tree-954');
  expect(tiles(map).map(t => t.moisture)).toEqual(moisture);
  delete map.cells[1][2].tree;
  expect(at(resolve(map).tiles, 2, 2).element).toBe('emperor-tree-945');
  const before = JSON.stringify(map);
  expect(trees.applyStroke(map, [[2, 1], [2, 2]], false, environment(map)).issues[0].code).toBe('tree-occupied');
  expect(trees.applyStroke(map, [[2, 1], [3, 3]], false, environment(map), 'bamboo-mature').issues[0].code).toBe('tree-occupied');
  expect(trees.applyStroke(map, [[2, 2]], false, environment(map), 'bamboo-mature').definition).toEqual(map);
  expect(trees.applyStroke(map, [[2, 1]], false, environment(map), 'unknown').issues[0].code).toBe('unsupported-tree');
  expect(JSON.stringify(map)).toBe(before);
});


test.each(['ordinary-stump', 'bamboo-stump'])('%s全部九图稳定，不按邻域分组；残株仍包围成熟树', kind => {
  const map = makeMap(5);
  map.cells.flat().forEach(cell => { cell.tree = kind; cell.terrainVariant = 0; });
  for (let variant = 0; variant < 9; variant++) {
    map.cells[2][2].terrainVariant = variant;
    expect(at(resolve(map).tiles, 2, 2).element).toBe(`emperor-tree-${963 + variant}`);
    delete map.cells[1][1].tree;
    expect(at(resolve(map).tiles, 2, 2).element).toBe(`emperor-tree-${963 + variant}`);
    map.cells[1][1].tree = kind;
  }
  map.cells[2][2].terrainVariant = 0;
  for (const [mature, base] of [['ordinary-mature', 927], ['bamboo-mature', 945]]) {
    map.cells[2][2].tree = mature;
    expect(at(resolve(map).tiles, 2, 2).element).toBe(`emperor-tree-${base + 9}`);
    delete map.cells[1][1].tree;
    expect(at(resolve(map).tiles, 2, 2).element).toBe(`emperor-tree-${base}`);
    map.cells[1][1].tree = kind;
    const before = JSON.stringify(map);
    expect(trees.applyStroke(map, [[0, 0], [2, 2]], false, environment(map), kind).issues[0].code).toBe('tree-occupied');
    expect(JSON.stringify(map)).toBe(before);
  }
  map.cells[2][2].tree = kind; delete map.cells[2][2].terrainVariant;
  const expected = resolve(map).tiles;
  const restored = maps.importMapDefinition(maps.exportMapDefinition(map, elements).json, elements).definition;
  for (const angle of [0, 90, 180, 270]) expect(resolve(restored, angle).tiles).toEqual(expected);
  const erased = trees.applyStroke(map, [[2, 2]], true, environment(map)).definition;
  const repainted = trees.applyStroke(erased, [[2, 2]], false, environment(erased), kind).definition;
  expect(resolve(repainted).tiles).toEqual(expected);
});
