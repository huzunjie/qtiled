import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as maps from '../src/maps';
import { resolveElementPlacement } from '../src/element-rendering/placement';
import { resolveElementDraw } from '../src/element-rendering/draw';
const read = file => fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
const elements = JSON.parse(read('static/construction-samples/elements.json'));
const rules = JSON.parse(read('static/construction-samples/road-rules.json'));
const context = vm.createContext({ window: { qtiledMaps: maps } });
vm.runInContext(read('static/js/construction-rules.js'), context);
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
