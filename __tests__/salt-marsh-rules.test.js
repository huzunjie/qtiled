import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createHash } from 'crypto';
import { imagePixels } from '../test-utils/image-pixels';
import { pathFinding } from '../src';
import * as maps from '../src/maps';
import * as view from '../src/isometric-view';
import { resolveElementDraw } from '../src/element-rendering/draw';

const read = file => fs.readFileSync(path.join(__dirname, '../demo/static', file));
const json = file => JSON.parse(read(file));
const elements = { ...json('terrain-samples/emperor-land-water/elements.json'), ...json('terrain-samples/emperor-elevation/elements.json'), ...json('construction-samples/elements.json') };
const rules = json('terrain-samples/emperor-land-water/rules.json');
const heights = json('terrain-samples/emperor-elevation/rules.json');
const roads = json('construction-samples/road-rules.json');
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps, qtiledView: view, qtiledElementRendering: { resolveElementDraw } } });
['terrain-sample', 'environment-rules', 'land-water-rules', 'elevation-rules', 'construction-rules', 'salt-marsh-rules', 'elevation-rendering'].forEach(name => vm.runInContext(read(`js/${name}.js`).toString(), context));
const { saltMarshRules: salt, elevationRules: elevation, constructionRules: construction, environmentRules: environment, elevationRendering: rendering } = context.window;
const makeMap = () => ({ version: 2, id: 'salt', tileSize: [80, 40], elevationStep: 40, climate: 'temperate',
  cells: Array.from({ length: 11 }, () => Array.from({ length: 15 }, () => ({ terrain: 'land', elevation: 8 }))), entities: [] });
const ground = (map, angle = 0) => elevation.resolve(map, elements, rules, heights, angle).tiles;
const resolve = (map, angle = 0) => {
  const road = construction.resolve(map, ground(map, angle), elements, roads, angle);
  expect(road.issues).toEqual([]);
  return salt.resolve(map, road.tiles, elements, road.index);
};
const at = (tiles, x, y) => tiles.find(tile => tile.grid[0] === x && tile.grid[1] === y);

// 来自九张原PNG完整RGBA，另已与原作RGB565解码核对；不从待测WebP反算期望值。
const rgbaHashes = [
  '6198bfea57d3881c46295abc8f0fb5ae804ef0f216707a3bd3e80b2cf0bdb3a8',
  '2c71fdff6c57c3f347fb61f55237326400033dc81753ca5fe2d7ed75b62145e7',
  '023eab8e45e7cc27bf3286fdac615a9484c1835333b0bc367e2a770f27d66498',
  '43425e650ac6004d3d1b5dac27936a259aa4fdf19f71feda6c04ef4272c54ec3',
  'c2864a2703df71dbb7d1da21a0b7f9993417ec832ca9652dbf2af0c1153cb68f',
  'b1fba7a2bbbb5ca8e0ec22281c7197b3c20fbf0b9588ec16b1f9002605b96766',
  '9796ee6dcef97b0d534a82e2c52af93542d23f28d96d31b8118a33c9b240d3e1',
  '3d225fbb26e06f1f99d906711c61d45fe7b7f6453ce7d56217de360ed4621f69',
  '209d2710745a845fc36eecd42057424810d7e4be7f28a25ab47b03fc31c93242',
];

test('九张原图WebP完整RGBA及四向裁切锚点保持', () => {
  const pixels = imagePixels(read('terrain-samples/emperor-land-water/salt-marsh-atlas.webp'));
  expect([pixels.width, pixels.height]).toEqual([238, 124]);
  rgbaHashes.forEach((hash, i) => {
    const element = elements[`emperor-salt-marsh-${869 + i}`];
    expect(element.footprint).toEqual([[0, 0]]);
    for (const angle of [0, 90, 180, 270]) {
      const { source, rect, anchor } = element.views[angle];
      expect(source).toBe('salt-marsh-atlas.webp');
      expect(rect).toEqual([i % 3 * 80, Math.floor(i / 3) * 42, 78, 40]);
      expect(anchor).toEqual([39, 20]);
      const rgba = Buffer.concat(Array.from({ length: 40 }, (_, y) => Buffer.from(pixels.data.slice(
        ((rect[1] + y) * pixels.width + rect[0]) * 4, ((rect[1] + y) * pixels.width + rect[0] + 78) * 4))));
      expect(createHash('sha256').update(rgba).digest('hex')).toBe(hash);
      expect(rgba[3]).toBe(0);
      expect(rgba[(20 * 78 + 39) * 4 + 3]).toBe(255);
    }
  });
});

test('16种道路邻接及四镜头铺路清路恢复同一盐沼图，邻路同步重算', () => {
  for (let mask = 0; mask < 16; mask++) {
    const map = makeMap(); Object.assign(map.cells[5][7], { saltMarsh: true, terrainVariant: 255 });
    [[7, 4], [8, 5], [7, 6], [6, 5]].forEach(([x, y], bit) => { if (mask & (1 << bit)) map.cells[y][x].road = 'ordinary'; });
    const paved = construction.applyRoadStroke(map, [[7, 5]]).definition;
    const cleared = construction.applyRoadStroke(paved, [[7, 5]], true).definition;
    expect(cleared).toEqual(map);
    for (const angle of [0, 90, 180, 270]) {
      const original = resolve(map, angle); const covered = resolve(paved, angle); const restored = resolve(cleared, angle);
      expect(original.issues).toEqual([]); expect(covered.issues).toEqual([]); expect(restored.issues).toEqual([]);
      expect(at(covered.tiles, 7, 5).element).toMatch(/^road-/);
      expect(at(restored.tiles, 7, 5).element).toBe('emperor-salt-marsh-872');
      expect(restored.tiles).toEqual(original.tiles);
      const draws = rendering.resolveTileDraws(at(restored.tiles, 7, 5), cleared, elements, { angle, tileSize: map.tileSize });
      expect(draws).toHaveLength(1); expect(draws[0].source).toBe('salt-marsh-atlas.webp');
    }
    expect(environment.deriveMoisture(paved.cells, paved.climate)).toEqual(environment.deriveMoisture(cleared.cells, cleared.climate));
  }
});

test('原九变体及稳定默认值跨四镜头、重算与存读不变', () => {
  const map = makeMap();
  for (let i = 0; i < 9; i++) Object.assign(map.cells[4][i + 3], { saltMarsh: true, terrainVariant: i });
  map.cells[6][7].saltMarsh = true;
  const exported = maps.exportMapDefinition(map, elements); expect(exported.issues).toEqual([]);
  const loaded = maps.importMapDefinition(exported.json, elements).definition;
  const ids = resolve(map).tiles.filter(tile => tile.saltMarsh).map(tile => tile.element);
  expect(ids.slice(0, 9)).toEqual(Array.from({ length: 9 }, (_, i) => `emperor-salt-marsh-${869 + i}`));
  for (const angle of [0, 90, 180, 270]) expect(resolve(loaded, angle).tiles.filter(tile => tile.saltMarsh).map(tile => tile.element)).toEqual(ids);
});

test('新增盐沼距水或海滩5格含斜向；整笔越界拒绝且不改基图', () => {
  for (const source of [{ terrain: 'water' }, { beach: true }]) {
    const map = makeMap(); Object.assign(map.cells[0][0], source);
    expect(salt.applyStroke(map, [[4, 4]]).issues[0].code).toBe('salt-marsh-near-water');
    const painted = salt.applyStroke(map, [[5, 5]]); expect(painted.issues).toEqual([]);
    expect(painted.definition.cells[5][5].saltMarsh).toBe(true); expect(map.cells[5][5].saltMarsh).toBeUndefined();
    map.cells[4][4].saltMarsh = true; expect(salt.applyStroke(map, [[4, 4]]).issues).toEqual([]);
    expect(salt.applyStroke(map, [[5, 5], [99, 99]]).definition).toBeNull();
    map.cells[6][6] = null; expect(salt.applyStroke(map, [[5, 5], [6, 6]]).definition).toBeNull();
    map.cells[5][5].road = 'ordinary'; expect(salt.applyStroke(map, [[5, 5]]).definition.cells[5][5]).toMatchObject({ road: 'ordinary', saltMarsh: true });
  }
});

test('非平地、其他地物、实体、非法事实与缺图明确拒绝', () => {
  const map = makeMap(); const tiles = ground(map);
  for (const extra of [{ terrain: 'water' }, { beach: true }, { ramp: true }, { halfSlope: true }, { rock: 'ordinary' }, { tree: 'ordinary' }, { dune: true }, { quarry: true }]) {
    const candidate = makeMap(); Object.assign(candidate.cells[5][7], extra, { saltMarsh: true });
    expect(salt.resolve(candidate, tiles, elements, new Map()).issues.length).toBeGreaterThan(0);
  }
  map.cells[5][7].saltMarsh = true;
  expect(salt.resolve(map, tiles, elements, new Map([['7,5', ['house']]])).issues[0].code).toBe('salt-marsh-occupied');
  const slopes = tiles.map(tile => tile.grid.join(',') === '7,5' ? { ...tile, slope: true } : tile);
  expect(salt.resolve(map, slopes, elements, new Map()).issues[0].code).toBe('salt-marsh-ground');
  map.cells[5][7].terrainVariant = 0;
  expect(salt.resolve(map, tiles, { ...elements, 'emperor-salt-marsh-869': undefined }, new Map()).issues[0].code).toBe('missing-salt-marsh-element');
  map.cells[5][7].saltMarsh = false;
  expect(salt.resolve(map, tiles, elements, new Map()).issues[0].code).toBe('salt-marsh-value');
});

test('盐沼复用6格起的干燥传播，与5格新增门槛分别处理', () => {
  const map = makeMap(); map.cells.forEach(row => { row[0].terrain = 'water'; });
  const original = environment.deriveMoisture(map.cells, map.climate);
  map.cells[5][5].saltMarsh = true;
  expect(environment.deriveMoisture(map.cells, map.climate)).toEqual(original);
  delete map.cells[5][5].saltMarsh; map.cells[5][6].saltMarsh = true;
  const dry = environment.deriveMoisture(map.cells, map.climate);
  expect(dry[5][6]).toBe(0); expect(dry[5][7]).toBe(10);
  map.cells[5][6].road = 'ordinary'; expect(environment.deriveMoisture(map.cells, map.climate)).toEqual(dry);
});

test.each([1, 2])('v%s陆水替换盐沼，普通清路保留原事实', version => {
  const map = makeMap(); map.version = version;
  if (version === 1) { delete map.elevationStep; map.cells.flat().forEach(cell => { cell.elevation = 0; }); }
  Object.assign(map.cells[5][7], { saltMarsh: true, terrainVariant: 8 });
  for (const terrain of ['land', 'water']) {
    const result = elevation.applyStroke(map, { terrain, grids: [[7, 5]] }, elements, rules, heights);
    expect(result.issues).toEqual([]); expect(result.definition.cells[5][7].saltMarsh).toBeUndefined();
    expect(result.definition.cells[5][7].terrain).toBe(terrain);
  }
  expect(construction.applyRoadStroke(map, [[7, 5]], true).definition).toEqual(map);
});
