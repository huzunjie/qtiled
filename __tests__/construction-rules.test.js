import { pathFinding } from '../src';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as maps from '../src/maps';
import { resolveElementPlacement } from '../src/element-rendering/placement';
import { resolveElementDraw } from '../src/element-rendering/draw';
const read = file => fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
const elements = JSON.parse(read('static/construction-samples/elements.json'));
const rules = JSON.parse(read('static/construction-samples/road-rules.json'));
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps } });
['terrain-sample', 'environment-rules', 'land-water-rules', 'construction-rules'].forEach(name => vm.runInContext(read(`static/js/${name}.js`), context));
const construction = context.window.constructionRules;
const fresh = (height = 8) => ({ version: 2, id: 'test', tileSize: [80, 40], elevationStep: 40,
  cells: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ terrain: 'land', elevation: height }))), entities: [] });
const tiles = map => map.cells.flatMap((row, y) => row.flatMap((cell, x) => cell ? [{ grid: [x, y], element: 'land', elevation: cell.elevation }] : []));
const resolve = map => construction.resolve(map, tiles(map), elements, rules);
const house = (map, placement = [4, 3], angle = 0, camera = 0, id = 'house-1') => ({ ...map, entities: [...map.entities,
  { id, element: 'courtyard-house', grid: resolveElementPlacement(elements['courtyard-house'], placement, angle, camera).grid, angle }] });

test('16种四邻连接全部匹配，四镜头只有选图改变，重复计算不洗牌', () => {
  const cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (let mask = 0; mask < 16; mask++) {
    const map = fresh();
    const grids = [[4, 4], ...cardinal.filter((_, i) => mask & (1 << i)).map(([x, y]) => [x + 4, y + 4])];
    const next = construction.applyRoadStroke(map, grids).definition;
    const original = JSON.stringify(next);
    for (const angle of [0, 90, 180, 270]) {
      const result = construction.resolve(next, tiles(next), elements, rules, angle);
      expect(result.issues).toEqual([]);
      const tile = result.tiles.find(tile => String(tile.grid) === '4,4');
      expect(elements[tile.element]).toBeDefined();
      expect(result).toEqual(construction.resolve(next, tiles(next), elements, rules, angle));
      expect(JSON.stringify(next)).toBe(original);
    }
  }
});

test('删岔路后重算邻接；重复落笔无变化且保留地表和额外属性', () => {
  const map = fresh();
  map.cells[4][4].note = '保留';
  const painted = construction.applyRoadStroke(map, [[4, 4], [4, 3], [4, 5], [5, 4]]).definition;
  const before = resolve(painted).tiles.find(tile => String(tile.grid) === '4,4').element;
  expect(construction.applyRoadStroke(painted, [[4, 4]]).definition).toEqual(painted);
  const erased = construction.applyRoadStroke(painted, [[5, 4]], true).definition;
  expect(resolve(erased).tiles.find(tile => String(tile.grid) === '4,4').element).not.toBe(before);
  expect(erased.cells[4][4]).toEqual({ terrain: 'land', elevation: 8, road: 'ordinary', note: '保留' });
  expect(erased.cells[4][5]).toEqual(map.cells[4][5]);
  expect(map.cells[4][4].road).toBeUndefined();
});

test('边界可落路，越界/空角整笔拒绝，非法road字段拒绝', () => {
  const map = fresh();
  expect(resolve(construction.applyRoadStroke(map, [[0, 0]]).definition).issues).toEqual([]);
  map.cells[0][0] = null;
  for (const grid of [[0, 0], [-1, 0], [10, 0]]) {
    expect(construction.applyRoadStroke(map, [[4, 4], grid]).definition).toBeNull();
    expect(map.cells[4][4].road).toBeUndefined();
  }
  map.cells[2][2].road = false;
  expect(resolve(map).issues[0].code).toBe('unsupported-road');
});

test('道路和建筑在0/8/16平台合法，水面/坡面/道路高差不合法', () => {
  for (const height of [0, 8, 16]) {
    const map = construction.applyRoadStroke(house(fresh(height)), [[7, 7], [7, 8]]).definition;
    expect(resolve(map).issues).toEqual([]);
    map.cells[7][7].terrain = 'water';
    expect(resolve(map).issues.some(issue => issue.code === 'construction-ground')).toBe(true);
    map.cells[7][7].terrain = 'land';
    map.cells[7][7].elevation = height + 1;
    expect(resolve(map).issues.length).toBeGreaterThan(0);
  }
  const map = house(fresh());
  const ground = tiles(map);
  ground.find(tile => String(tile.grid) === String(map.entities[0].grid)).slope = true;
  expect(construction.validate(map, ground, elements).issues[0].code).toBe('construction-ground');
});

test('建筑16组姿态均与矩形上角格对齐，重复占地/道路/水面/不等高和越界拒绝', () => {
  for (const camera of [0, 90, 180, 270]) for (const angle of [0, 90, 180, 270]) {
    const map = house(fresh(), [4, 3], angle, camera);
    const entity = map.entities[0];
    const draw = resolveElementDraw(elements[entity.element], entity.grid, { angle: camera, tileSize: [80, 40] }, angle);
    expect(draw.placementGrid).toEqual([4, 3]);
    expect(resolve(map).issues).toEqual([]);
    const [x, y] = draw.footprint[0].grid;
    const overlap = house(map, [4, 3], angle, camera, 'house-2');
    expect(resolve(overlap).issues.length).toBeGreaterThan(0);
    map.cells[y][x].road = 'ordinary';
    expect(resolve(map).issues.some(issue => issue.code === 'road-occupied')).toBe(true);
    delete map.cells[y][x].road;
    map.cells[y][x].terrain = 'water';
    expect(resolve(map).issues.some(issue => issue.code === 'construction-ground')).toBe(true);
    map.cells[y][x].terrain = 'land';
    map.cells[y][x].elevation++;
    expect(resolve(map).issues.length).toBeGreaterThan(0);
  }
  expect(resolve(house(fresh(), [0, 0])).issues.length).toBeGreaterThan(0);
});

const copy = map => JSON.parse(JSON.stringify(map));

test('每类自然地物均清除完整实体，地表冲突每格只报告一次', () => {
  const before = house(fresh());
  const [key] = maps.buildMapOccupancy(before, elements).index.keys();
  const [x, y] = key.split(',').map(Number);
  for (const field of context.window.landWaterRules.naturalFields) {
    const after = copy(before); after.cells[y][x][field] = true;
    expect(construction.validate(after, tiles(after), elements).issues).toEqual([
      expect.objectContaining({ path: `cells[${y}][${x}]`, code: 'entity-ground' }),
    ]);
    expect(construction.reconcileSurface(before, after, elements).definition.entities).toEqual([]);
  }
  expect(before.entities).toHaveLength(1);
});

test('地表变化按旋转后的完整占地移除实例，保留合法实例及原地图', () => {
  for (const angle of [0, 90, 180, 270]) {
    const before = house(house(fresh(), [4, 3], angle), [8, 7], 0, 0, 'outside');
    const footprint = [...maps.buildMapOccupancy(before, elements).index].filter(([, ids]) => ids.includes('house-1'));
    for (const [key] of footprint) {
      const after = copy(before); const [x, y] = key.split(',').map(Number);
      after.cells[y][x].terrain = 'water';
      const result = construction.reconcileSurface(before, after, elements);
      expect(result.issues).toEqual([]);
      expect(result.definition.entities.map(entity => entity.id)).toEqual(['outside']);
      expect(before.entities).toHaveLength(2);
      expect(before.cells[y][x].terrain).toBe('land');
      expect(maps.buildMapOccupancy(result.definition, elements).index.has(key)).toBe(false);
    }
  }
});

test('水面专属测试元素在填陆或海滩后整实例清除，不误删仍在水中的实例', () => {
  const library = { ...elements, 'water-fixture': { ...elements['courtyard-house'], id: 'water-fixture', groundTerrain: 'water' } };
  const before = house(house(fresh(), [4, 3]), [8, 7], 0, 0, 'outside');
  before.entities.forEach(entity => { entity.element = 'water-fixture'; });
  for (const key of maps.buildMapOccupancy(before, library).index.keys()) {
    const [x, y] = key.split(',').map(Number); before.cells[y][x].terrain = 'water';
  }
  expect(construction.validate(before, tiles(before), library).issues).toEqual([]);
  const key = [...maps.buildMapOccupancy(before, library).index.keys()][1];
  const [x, y] = key.split(',').map(Number);
  for (const beach of [false, true]) {
    const after = copy(before); Object.assign(after.cells[y][x], { terrain: 'land', ...(beach ? { beach: true } : {}) });
    expect(construction.validate(after, tiles(after), library).issues.some(item => item.code === 'entity-ground')).toBe(true);
    const result = construction.reconcileSurface(before, after, library);
    expect(result.definition.entities.map(entity => entity.id)).toEqual(['outside']);
    expect(construction.validate(result.definition, tiles(result.definition), library).issues).toEqual([]);
  }
});

test('只清除失效道路，同类重画和未改格不删除内容；读图校验不偷偷清理', () => {
  const before = house(fresh()); before.cells[7][7].road = 'ordinary'; before.cells[7][8].road = 'ordinary';
  expect(construction.reconcileSurface(before, copy(before), elements).definition).toEqual(before);
  for (const target of [{ terrain: 'water' }, { terrain: 'land', beach: true }]) {
    const after = copy(before); Object.assign(after.cells[7][7], target);
    const next = construction.reconcileSurface(before, after, elements).definition;
    expect(next.cells[7][7].road).toBeUndefined(); expect(next.cells[7][8].road).toBe('ordinary');
    expect(next.entities).toEqual(before.entities);
  }
  const invalid = copy(before); invalid.cells[3][4].terrain = 'water';
  const snapshot = copy(invalid); construction.validate(invalid, tiles(invalid), elements); expect(invalid).toEqual(snapshot);
});

const wallAt = (map, angle = 0) => construction.resolve(map, tiles(map), elements, rules, angle).tiles.find(tile => String(tile.grid) === '4,4');

test('住宅墙使用专用连接表，端点/转角/T形/十字随四镜头换图，删除门也重算邻墙', () => {
  const cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  // 原作表的独立样例（镜头列已换为 QTiled 0/90/180/270）。
  const cases = [[1, [0, 2, 0, 2]], [3, [6, 7, 4, 5]], [7, [8, 9, 10, 11]], [15, [12, 12, 12, 12]]];
  for (const [mask, expected] of cases) {
    const grids = [[4, 4], ...cardinal.filter((_, i) => mask & 1 << i).map(([x, y]) => [4 + x, 4 + y])];
    const map = construction.applyWallStroke(fresh(), grids).definition;
    const snapshot = copy(map);
    [0, 90, 180, 270].forEach((angle, i) => expect(wallAt(map, angle).element).toBe(`residential-wall-${370 + expected[i]}`));
    expect(map).toEqual(snapshot);
  }
  const map = fresh(); map.cells[4][5].road = 'ordinary';
  const placed = construction.applyWallStroke(map, [[4, 4], [5, 4], [4, 3]]).definition;
  expect(wallAt(placed).element).toBe('residential-wall-376');
  expect(wallAt(construction.applyWallStroke(placed, [[5, 4]], true).definition).element).toBe('residential-wall-370');
});

test('先路后墙生成独立门，四向跟随道路；先墙后路拒绝，拆门保留路且须先拆门才能删路', () => {
  for (const neighbors of [[[4, 3], [4, 5]], [[3, 4], [5, 4]], []]) {
    const road = construction.applyRoadStroke(fresh(), [[4, 4], ...neighbors]).definition;
    const gate = construction.applyWallStroke(road, [[4, 4]]).definition;
    expect(gate.cells[4][4]).toEqual({ terrain: 'land', elevation: 8, road: 'ordinary', residentialWall: 'gate-1' });
    expect([0, 90, 180, 270].map(angle => wallAt(gate, angle).element)).toEqual(
      (neighbors[0]?.[0] === 4 ? [384, 383, 384, 383] : [383, 384, 383, 384]).map(id => `residential-wall-${id}`));
    expect(construction.applyRoadStroke(gate, [[4, 4]], true).definition).toBeNull();
    expect(construction.applyWallStroke(gate, [[4, 4]], true).definition).toEqual(road);
    expect(construction.applyWallStroke(gate, [[4, 4]]).definition).toEqual(gate);
  }
  const wall = construction.applyWallStroke(fresh(), [[4, 4]]).definition;
  expect(construction.applyRoadStroke(wall, [[4, 3], [4, 4]]).definition).toBeNull();
  const sides = construction.applyRoadStroke(wall, [[4, 3], [4, 5]]).definition;
  expect(sides.cells[4][4].residentialWall).toBe('wall-1');
  expect(construction.applyWallStroke(sides, [[4, 4]]).definition).toEqual(sides);
});

test('住宅墙拒绝树木及其他自然地物、实体、水面、坡面和非法身份，地形修改只清失效墙门', () => {
  for (const field of context.window.landWaterRules.naturalFields) {
    const map = fresh(); map.cells[4][4][field] = true;
    expect(resolve(construction.applyWallStroke(map, [[4, 4]]).definition).issues.some(i => i.code === 'wall-ground')).toBe(true);
  }
  const occupied = house(fresh());
  const [key] = maps.buildMapOccupancy(occupied, elements).index.keys();
  expect(resolve(construction.applyWallStroke(occupied, [key.split(',').map(Number)]).definition).issues.some(i => i.code === 'wall-ground')).toBe(true);
  const wall = construction.applyWallStroke(fresh(), [[4, 4], [7, 7]]).definition;
  const ground = tiles(wall); ground.find(tile => String(tile.grid) === '4,4').slope = true;
  expect(construction.validate(wall, ground, elements).issues.some(i => i.code === 'wall-ground')).toBe(true);
  const cleaned = construction.reconcileTerrain(wall, wall, ground, elements).definition;
  expect(cleaned.cells[4][4].residentialWall).toBeUndefined(); expect(cleaned.cells[7][7].residentialWall).toBe('wall-1');
  const water = copy(wall); water.cells[4][4].terrain = 'water';
  expect(resolve(water).issues.some(i => i.code === 'wall-ground')).toBe(true);
  expect(construction.reconcileSurface(wall, water, elements).definition.cells[4][4].residentialWall).toBeUndefined();
  for (const value of [false, null, ['wall-1'], 'wall-5', 'gate-1']) {
    const invalid = copy(wall); invalid.cells[4][4].residentialWall = value;
    expect(resolve(invalid).issues.length).toBeGreaterThan(0);
  }
  expect(construction.applyWallStroke(wall, [[4, 4], [-1, 0]]).definition).toBeNull();
});

test.each([1, 2, 3, 4])('第 %i 款混合邻接保留本款外观，门洞/删除/重画/地形清理采用同一规则', style => {
  const base = [370, 387, 404, 421][style - 1];
  let map = construction.applyWallStroke(fresh(), [[4, 4]], false, style).definition;
  const other = style % 4 + 1;
  map = construction.applyWallStroke(map, [[4, 3], [5, 4]], false, other).definition;
  [0, 90, 180, 270].forEach((angle, i) => expect(wallAt(map, angle).element).toBe(`residential-wall-${base + [6, 7, 4, 5][i]}`));
  expect(construction.applyWallStroke(map, [[4, 4]], false, style).definition).toEqual(map);
  expect(construction.applyWallStroke(map, [[3, 4], [4, 4]], false, other).definition).toBeNull();
  expect(construction.applyRoadStroke(map, [[4, 4]]).definition).toBeNull();
  map = construction.applyRoadStroke(fresh(), [[4, 4], [4, 3]]).definition;
  map = construction.applyWallStroke(map, [[4, 4]], false, style).definition;
  expect(map.cells[4][4].residentialWall).toBe(`gate-${style}`);
  [0, 90, 180, 270].forEach((angle, i) => expect(wallAt(map, angle).element).toBe(`residential-wall-${base + [14, 13, 14, 13][i]}`));
  expect(construction.applyRoadStroke(map, [[4, 4]], true).definition).toBeNull();
  expect(construction.applyWallStroke(map, [[4, 4]], true).definition.cells[4][4]).toEqual({ terrain: 'land', elevation: 8, road: 'ordinary' });
  const water = copy(map); water.cells[4][4].terrain = 'water';
  const cleared = construction.reconcileSurface(map, water, elements).definition.cells[4][4];
  expect(cleared.road).toBeUndefined(); expect(cleared.residentialWall).toBeUndefined();
  for (const invalid of [0, 5, '2', NaN]) expect(construction.applyWallStroke(map, [[4, 4]], false, invalid).definition).toBeNull();
});
