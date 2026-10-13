import fs from 'fs';
import vm from 'vm';
import { pathFinding } from '../src';
import * as maps from '../src/maps';
import * as view from '../src/isometric-view';
import { resolveElementDraw } from '../src/element-rendering/draw';

const read = file => fs.readFileSync(`${__dirname}/../demo/static/${file}`, 'utf8');
const json = file => JSON.parse(read(file));
const elements = { ...json('terrain-samples/emperor-land-water/elements.json'), ...json('terrain-samples/emperor-elevation/elements.json'), ...json('construction-samples/elements.json') };
const rules = json('terrain-samples/emperor-land-water/rules.json');
const heights = json('terrain-samples/emperor-elevation/rules.json');
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps, qtiledView: view, qtiledElementRendering: { resolveElementDraw } } });
['terrain-sample', 'environment-rules', 'land-water-rules', 'elevation-rules', 'rock-rules', 'tree-rules', 'elevation-rendering'].forEach(name => vm.runInContext(read(`js/${name}.js`), context));
const { rockRules: rocks, treeRules: trees, elevationRules: elevation, elevationRendering: rendering } = context.window;
const makeMap = () => ({ version: 2, id: 'rocks', tileSize: [80, 40], elevationStep: 40, cells: Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => ({ terrain: 'land', elevation: 8 }))), entities: [] });
const tiles = (map, angle = 0) => {
  const result = elevation.resolve(map, elements, rules, heights, angle);
  expect(result.issues).toEqual([]);
  return result.tiles;
};
const resolve = (map, angle = 0) => rocks.resolve(map, tiles(map, angle), elements, maps.buildMapOccupancy(map, elements).index);
const at = (list, x, y) => list.find(tile => tile.grid[0] === x && tile.grid[1] === y);

test.each([['ordinary', 458], ['copper', 472], ['iron', 486]])('%s八外观、四向、重画、存读稳定，且不增湿', (kind, base) => {
  for (const climate of [undefined, 'arid', 'temperate', 'humid']) {
    const map = makeMap(); if (climate) map.climate = climate;
    const before = tiles(map);
    const painted = rocks.applyStroke(map, [[3, 3]], false, kind).definition;
    expect(tiles(painted)).toEqual(before);
    expect(map.cells[3][3].rock).toBeUndefined();
    for (let i = 0; i < 8; i++) {
      painted.cells[3][3].terrainVariant = i;
      const exported = maps.exportMapDefinition(JSON.parse(JSON.stringify(painted)), elements);
      expect(exported.issues).toEqual([]);
      const restored = maps.importMapDefinition(exported.json, elements).definition;
      for (const angle of [0, 90, 180, 270]) {
        const result = resolve(restored, angle); expect(result.issues).toEqual([]);
        const tile = at(result.tiles, 3, 3); expect(tile.element).toBe(`emperor-rock-${base + i}`);
        const draws = rendering.resolveTileDraws(tile, restored, elements, { angle, tileSize: map.tileSize });
        expect(draws).toHaveLength(1); expect(draws[0].footprint).toHaveLength(1);
      }
    }
    const erased = rocks.applyStroke(painted, [[3, 3]], true).definition;
    expect(resolve(rocks.applyStroke(erased, [[3, 3]], false, kind).definition).tiles).toEqual(resolve(painted).tiles);
  }
});

test('非法类别、越界、空角及缺素材均拒绝；输入不变', () => {
  const map = makeMap(); const original = JSON.stringify(map);
  for (const kind of [null, [], {}, ['copper'], 'toString', '__proto__', 'gold']) {
    expect(rocks.applyStroke(map, [[3, 3]], false, kind).issues).not.toEqual([]);
    const invalid = makeMap(); invalid.cells[3][3].rock = kind;
    expect(resolve(invalid).issues[0].code).toBe('unsupported-rock');
  }
  expect(rocks.applyStroke(map, [[3, 3], [-1, 0]], false).definition).toBeNull();
  expect(JSON.stringify(map)).toBe(original);
  map.cells[1][1] = null;
  expect(rocks.applyStroke(map, [[3, 3], [1, 1]], true).definition).toBeNull();
  map.cells[3][3].rock = 'copper';
  expect(rocks.resolve(map, tiles(map), {}, new Map()).issues[0].code).toBe('missing-rock-element');
});

test.each(['ordinary', 'copper', 'iron'])('%s拒绝水路植被完整建筑占用及半坡主副格', kind => {
  for (const extra of [{ terrain: 'water' }, { road: 'ordinary' }, ...['ordinary-mature', 'bamboo-mature', 'ordinary-stump', 'bamboo-stump'].map(tree => ({ tree }))]) {
    const map = makeMap(); map.climate = 'arid'; Object.assign(map.cells[3][3], extra, { rock: kind });
    expect(resolve(map).issues.length).toBeGreaterThan(0);
  }
  const map = makeMap(); map.cells[3][3].rock = kind;
  map.entities = [{ id: 'house', element: 'courtyard-house', grid: [2, 2], angle: 0 }];
  expect(resolve(map).issues[0].code).toBe('rock-occupied');
  const slopes = json('map-samples/slope-features-map.json');
  for (const grid of [[11, 4], [11, 5]]) {
    const candidate = rocks.applyStroke(slopes, [grid], false, kind).definition;
    expect(resolve(candidate).issues[0].code).toBe('rock-ground');
  }
});

test.each(['ordinary-mature', 'bamboo-mature'])('%s包围接受三类岩石，清除后回外围且变体不变', tree => {
  const map = makeMap(); map.climate = 'arid';
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) map.cells[y][x].tree = 'ordinary-stump';
  map.cells[3][3].tree = tree; map.cells[3][3].terrainVariant = 5;
  delete map.cells[2][2].tree;
  const base = tree === 'ordinary-mature' ? 927 : 945;
  const treeTile = m => at(trees.resolve(m, tiles(m), elements, new Map()).tiles, 3, 3);
  for (const kind of ['ordinary', 'copper', 'iron']) {
    map.cells[2][2].rock = kind;
    expect(treeTile(map).element).toBe(`emperor-tree-${base + 9 + 5}`);
    const erased = rocks.applyStroke(map, [[2, 2]], true).definition;
    expect(treeTile(erased).element).toBe(`emperor-tree-${base + 5}`);
  }
});

test('未指定变体时世界坐标稳定，换类别只换语义池，样本全部合法', () => {
  const map = makeMap();
  const variants = ['ordinary', 'copper', 'iron'].map(kind => at(resolve(rocks.applyStroke(map, [[3, 3]], false, kind).definition).tiles, 3, 3).variant);
  expect(new Set(variants).size).toBe(1);
  const sample = json('map-samples/mineral-map.json');
  expect(resolve(sample).issues).toEqual([]);
  const result = trees.resolve(sample, resolve(sample).tiles, elements, maps.buildMapOccupancy(sample, elements).index);
  expect(result.issues).toEqual([]); expect(at(result.tiles, 29, 13).element).toBe('emperor-tree-936');
});

test.each([['ordinary', 458], ['copper', 472], ['iron', 486]])('%s大块全部六种素材、四向底面与文件回读一致', (kind, base) => {
  for (const [size, count, offset] of [[2, 4, 8], [3, 2, 12]]) {
    for (let variant = 0; variant < count; variant++) {
      const map = makeMap();
      for (let y = 2; y < 2 + size; y++) for (let x = 2; x < 2 + size; x++) Object.assign(map.cells[y][x], { rock: kind, terrainVariant: variant });
      const stored = JSON.stringify(map);
      for (const angle of [0, 90, 180, 270]) {
        const result = resolve(JSON.parse(stored), angle); expect(result.issues).toEqual([]);
        const parts = result.tiles.filter(tile => tile.rock);
        expect(parts).toHaveLength(size * size);
        expect(parts.every(tile => tile.element === `emperor-rock-${base + offset + variant}` && tile.rockSize === size)).toBe(true);
        const v = { angle, tileSize: map.tileSize };
        const draws = parts.flatMap(tile => rendering.resolveTileDraws(tile, map, elements, v));
        expect(draws).toHaveLength(1); const draw = draws[0];
        expect(draw.footprint).toHaveLength(size * size);
        const center = view.projectGrid([2 + (size - 1) / 2, 2 + (size - 1) / 2], v);
        expect(draw.position[0] + draw.rect[2] / 2).toBe(center[0]);
        expect(draw.position[1] + draw.rect[3]).toBe(center[1] + size * 20 - 8 * 40);
      }
      expect(JSON.stringify(map)).toBe(stored);
      const exported = maps.exportMapDefinition(map, elements);
      expect(resolve(maps.importMapDefinition(exported.json, elements).definition).tiles).toEqual(resolve(map).tiles);
    }
  }
});

test('原作逐行先3后2的竞争规则不混类；局部清除与重画从事实重分块', () => {
  const map = makeMap();
  for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) map.cells[y][x].rock = 'copper';
  const owners = m => resolve(m).tiles.filter(tile => tile.rock && tile.grid.join(',') === tile.rockOwner.join(',')).map(tile => [tile.grid, tile.rockSize]);
  expect(owners(map)).toEqual([[[0, 0], 3], [[3, 0], 3], [[0, 3], 2], [[2, 3], 2], [[4, 3], 2]]);
  const before = resolve(map).tiles;
  const reversed = rocks.resolve(map, tiles(map).reverse(), elements, new Map());
  expect(reversed.tiles.find(tile => tile.grid.join(',') === '2,2').rockOwner).toEqual([0, 0]);
  const edited = rocks.applyStroke(map, [[1, 1]], true).definition;
  expect(edited.cells[1][1].rock).toBeUndefined();
  expect(edited.cells.flat().filter(cell => cell.rock)).toHaveLength(29);
  expect(at(resolve(edited).tiles, 2, 2).rockOwner).not.toEqual([0, 0]);
  const repainted = rocks.applyStroke(edited, [[1, 1]], false, 'copper').definition;
  expect(resolve(repainted).tiles).toEqual(before);
  for (const kind of ['ordinary', 'iron']) {
    const mixed = rocks.applyStroke(map, [[1, 1]], false, kind).definition;
    const selected = at(resolve(mixed).tiles, 1, 1);
    expect(selected.rock).toBe(kind); expect(selected.rockSize).toBe(1);
    expect(mixed.cells.flat().filter(cell => cell.rock === 'copper')).toHaveLength(29);
  }
});

test('大块不会越界、跨空角或跨高程；缺大块图或错误占地拒绝', () => {
  const map = makeMap();
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) Object.assign(map.cells[y][x], { rock: 'iron', terrainVariant: 0 });
  const validTiles = tiles(map);
  expect(rocks.resolve(map, validTiles, { ...elements, 'emperor-rock-498': undefined }, new Map()).issues[0].code).toBe('missing-rock-element');
  const bad = { ...elements, 'emperor-rock-498': { ...elements['emperor-rock-498'], footprint: [[0, 0]] } };
  expect(rocks.resolve(map, validTiles, bad, new Map()).issues[0].code).toBe('missing-rock-element');
  map.cells[0][0] = null;
  expect(resolve(map).issues).toEqual([]);
  expect(resolve(map).tiles.filter(tile => tile.rock).every(tile => tile.rockSize < 3)).toBe(true);
  // 直接传不同高度的已派生平面，确认分块本身也不跨高程；实际坡面由前置资格拒绝。
  const uneven = validTiles.map(tile => tile.grid.join(',') === '1,1' ? { ...tile, elevation: 9 } : tile);
  const withoutHole = makeMap();
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) withoutHole.cells[y][x].rock = 'iron';
  expect(rocks.resolve(withoutHole, uneven, elements, new Map()).tiles.filter(tile => tile.rock).every(tile => tile.rockSize < 3)).toBe(true);
});
