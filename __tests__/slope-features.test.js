import { pathFinding } from '../src';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as maps from '../src/maps';

const read = file => fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
const json = file => JSON.parse(read(file));
const land = json('static/terrain-samples/emperor-land-water/rules.json');
const height = json('static/terrain-samples/emperor-elevation/rules.json');
const roads = json('static/construction-samples/road-rules.json');
const elements = Object.assign({}, ...['emperor-land-water', 'emperor-elevation'].map(name => json(`static/terrain-samples/${name}/elements.json`)), json('static/construction-samples/elements.json'));
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps } });
for (const name of ['terrain-sample', 'environment-rules', 'land-water-rules', 'elevation-rules', 'construction-rules']) vm.runInContext(read(`static/js/${name}.js`), context);
const elevation = context.window.elevationRules;
const construction = context.window.constructionRules;
const resolve = (map, angle = 0) => elevation.resolve(map, elements, land, height, angle);
const feature = (map, type, grid = [5, 5]) => elevation.applyFeature(map, { type, grid }, elements, land, height);
const full = (map, angle = 0) => {
  const result = resolve(map, angle);
  return result.issues.length ? result : construction.resolve(map, result.tiles, elements, roads, angle);
};
const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const fresh = (direction = 0, climate = 'temperate') => {
  const [dx, dy] = directions[direction];
  return { version: 2, id: 'slope-test', tileSize: [80, 40], elevationStep: 40, climate, entities: [],
    cells: Array.from({ length: 11 }, (_, y) => Array.from({ length: 11 }, (_, x) => ({ terrain: 'land', elevation: (x - 5) * dx + (y - 5) * dy < 0 ? 9 : 8 }))) };
};
const at = (result, grid = [5, 5]) => result.tiles.find(tile => tile.grid.join(',') === grid.join(','));
const road = (map, grids, erase = false) => construction.applyRoadStroke(map, grids, erase, resolve(map).tiles).definition;
const heights = map => map.cells.map(row => row.map(cell => cell?.elevation));

// 期望值来自原作表67～74及0x4772f0分支，不从被测函数倒推。
test.each(['temperate', 'humid', 'arid'])('%s 四世界方向×四镜头：坡道、半坡和专用道路图，不改变高度或输入', climate => {
  for (let d = 0; d < 4; d++) {
    const [dx, dy] = directions[d];
    const map = fresh(d, climate), original = JSON.stringify(map);
    let next = feature(map, 'half-slope').definition;
    expect(next).not.toBeNull();
    next = feature(next, 'ramp', [5 + dx, 5 + dy]).definition;
    next = road(next, [[5 - dx, 5 - dy], [5, 5], [5 + 2 * dx, 5 + 2 * dy]]);
    expect(next.cells[5 + dy][5 + dx].road).toBe('ordinary');
    const prefix = climate === 'arid' ? 'emperor-elevation-dirt-' : 'emperor-elevation-';
    for (const [turn, angle] of [0, 90, 180, 270].entries()) {
      const visual = (d + turn + 3) % 4;
      const result = full(next, angle);
      expect(result.issues).toEqual([]);
      expect(at(result)).toMatchObject({ element: `${prefix}${285 + 2 * visual}`, slopeOwner: [5, 5], slopePart: 0 });
      expect(at(result, [5 + dx, 5 + dy])).toMatchObject({ element: `${prefix}${286 + 2 * visual}`, slopeOwner: [5, 5], slopePart: 1 });
      const plainRamp = feature(map, 'ramp').definition;
      expect(at(resolve(plainRamp, angle)).element).toBe(`${prefix}${233 + visual}`);
      expect(at(full(road(plainRamp, [[5, 5]]), angle)).element).toBe(`${prefix}${237 + visual}`);
    }
    const saved = maps.importMapDefinition(JSON.stringify(next)).definition;
    expect(saved).toEqual(next);
    expect(full(saved)).toEqual(full(next));
    expect(heights(next)).toEqual(heights(map));
    expect(JSON.stringify(map)).toBe(original);
  }
});

test('孤立、两种端部、连续直段使用原作半坡图；世界邻接不随镜头改变', () => {
  const expected = [[317, 303, 301, 269], [319, 307, 305, 271], [321, 309, 311, 273], [323, 315, 313, 275]];
  for (let d = 0; d < 4; d++) for (let side = 0; side < 4; side++) {
    const map = fresh(d), [dx, dy] = directions[d];
    map.cells[5][5].halfSlope = true;
    for (const [i, sign] of [1, -1].entries()) if (side & (1 << i)) map.cells[5 - dx * sign][5 + dy * sign].halfSlope = true;
    for (const [turn, angle] of [0, 90, 180, 270].entries()) {
      const result = resolve(map, angle);
      expect(result.issues).toEqual([]);
      expect(at(result).element).toBe(`emperor-elevation-${expected[(d + turn + 3) % 4][side]}`);
    }
  }
});

test('半坡任一部件整体铺擦道路；道路侧入拒绝，移除前须擦路，撤销半坡保留坡道', () => {
  const map = feature(feature(fresh(), 'half-slope').definition, 'ramp').definition;
  const painted = road(map, [[5, 4]]);
  expect(full(painted).issues).toEqual([]);
  expect(painted.cells[5][5].road).toBe('ordinary');
  expect(feature(painted, 'ramp', [5, 4]).issues[0].code).toBe('slope-feature-road');
  expect(feature(painted, 'half-slope').definition).toBeNull();
  expect(full(road(painted, [[4, 4]])).issues.some(issue => issue.code === 'road-height')).toBe(true);
  const erased = road(painted, [[5, 4]], true);
  expect(erased).toEqual(map);
  const removed = feature(erased, 'half-slope', [5, 4]);
  expect(removed.definition.cells[5][5]).toMatchObject({ ramp: true, elevation: 8 });
  expect(removed.definition.cells[5][5].halfSlope).toBeUndefined();
  expect(removed.selectedGrids).toEqual(expect.arrayContaining([[5, 5], [5, 4]]));
  expect(feature(removed.definition, 'ramp').definition).toEqual(fresh());
  const incomplete = JSON.parse(JSON.stringify(painted));
  delete incomplete.cells[4][5].road;
  expect(resolve(incomplete).issues[0].code).toBe('half-slope-road');
});

test('平地、角形、两级、缺空间、错误事实、实体、半坡无坡道铺路和被破坏的高度整笔拒绝', () => {
  expect(feature(fresh(), 'ramp', [5, 2]).definition).toBeNull();
  const corner = fresh(); corner.cells[5][4].elevation = 9;
  expect(feature(corner, 'ramp').definition).toBeNull();
  const tall = fresh(); tall.cells.forEach(row => row.forEach(cell => { if (cell.elevation === 9) cell.elevation = 10; }));
  expect(feature(tall, 'ramp').definition).toBeNull();
  for (const bad of [null, { terrain: 'water', elevation: 8 }, { terrain: 'land', elevation: 8, halfSlope: true }]) {
    const map = fresh(); map.cells[4][5] = bad;
    expect(feature(map, 'half-slope').definition).toBeNull();
  }
  const badFlag = fresh(); badFlag.cells[5][5].ramp = false;
  expect(resolve(badFlag).issues[0].code).toBe('invalid-slope-feature');
  const half = feature(fresh(), 'half-slope').definition;
  expect(full(road(half, [[5, 4]])).issues.some(issue => issue.code === 'construction-ground')).toBe(true);
  const broken = JSON.parse(JSON.stringify(half)); broken.cells[4][5].elevation = 9;
  expect(resolve(broken).issues.length).toBeGreaterThan(0);
  const occupied = fresh();
  occupied.entities.push({ id: 'house', element: 'courtyard-house', grid: [5, 4], angle: 0 });
  expect(feature(occupied, 'half-slope').definition).toBeNull();
  const v1 = fresh(); v1.version = 1; v1.cells.flat().forEach(cell => { cell.elevation = 0; }); v1.cells[5][5].halfSlope = true;
  expect(resolve(v1).issues[0].code).toBe('slope-feature-version');
});

test('可交互样本两主题四镜头完整解析，序列化只保存作者事实', () => {
  const map = json('static/map-samples/slope-features-map.json');
  for (const climate of ['temperate', 'arid']) for (const angle of [0, 90, 180, 270]) {
    expect(full({ ...map, climate }, angle).issues).toEqual([]);
  }
  expect(JSON.stringify(map)).not.toMatch(/slopeOwner|slopePart|slopeDirection|element/);
});

test('畸形旧地图仍返回结构诊断，不因读取扩展字段抛异常', () => {
  for (const cells of [{}, [null], ['bad-row']]) {
    expect(resolve({ version: 1, id: 'bad', tileSize: [80, 40], cells, entities: [] }).issues.length).toBeGreaterThan(0);
  }
});
