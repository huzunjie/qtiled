import fs from 'fs';
import path from 'path';
import vm from 'vm';
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
const context = vm.createContext({ window: { qtiled: { pathFinding }, qtiledMaps: maps, qtiledView: view, qtiledElementRendering: { resolveElementDraw } } });
['terrain-sample', 'environment-rules', 'land-water-rules', 'elevation-rules', 'dune-rules', 'elevation-rendering'].forEach(name => vm.runInContext(read(`js/${name}.js`).toString(), context));
const { duneRules: dunes, elevationRules: elevation, elevationRendering: rendering, environmentRules: environment } = context.window;
const makeMap = () => ({ version: 2, id: 'dunes', tileSize: [80, 40], elevationStep: 40, climate: 'arid',
  cells: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ terrain: 'land', elevation: 8 }))), entities: [] });
const ground = map => elevation.resolve(map, elements, rules, heights, 0).tiles;
const resolve = (map, angle = 0) => dunes.resolve(map, elevation.resolve(map, elements, rules, heights, angle).tiles,
  elements, maps.buildMapOccupancy(map, elements).index);
const at = (tiles, x, y) => tiles.find(tile => tile.grid[0] === x && tile.grid[1] === y);

test('14张原图真实像素、四向图幅和1/4/9格声明均有效', () => {
  const pixels = imagePixels(read('terrain-samples/emperor-land-water/dunes-atlas.webp'));
  expect([pixels.width, pixels.height]).toEqual([638, 264]);
  for (let id = 1138; id <= 1151; id++) {
    const element = elements[`emperor-dune-${id}`]; const size = id < 1146 ? 1 : id < 1150 ? 2 : 3;
    expect(element.footprint).toHaveLength(size * size);
    for (const angle of [0, 90, 180, 270]) {
      const { source, rect } = element.views[angle]; expect(source).toBe('dunes-atlas.webp');
      expect(rect[0] + rect[2]).toBeLessThanOrEqual(pixels.width);
      expect(rect[1] + rect[3]).toBeLessThanOrEqual(pixels.height);
      expect(Array.from({ length: rect[2] * rect[3] }, (_, i) => pixels.data[((rect[1] + Math.floor(i / rect[2])) * pixels.width + rect[0] + i % rect[2]) * 4 + 3]).some(Boolean)).toBe(true);
    }
  }
});

test('逐格事实重分块、四镜头、存读及整笔越界拒绝', () => {
  const map = makeMap(); const grids = Array.from({ length: 9 }, (_, i) => [2 + i % 3, 2 + Math.floor(i / 3)]);
  const painted = dunes.applyStroke(map, grids, false).definition;
  expect(map.cells[2][2].dune).toBeUndefined();
  for (const angle of [0, 90, 180, 270]) {
    const result = resolve(painted, angle); expect(result.issues).toEqual([]);
    expect(result.tiles.filter(tile => tile.duneSize === 3)).toHaveLength(9);
    const draws = result.tiles.flatMap(tile => rendering.resolveTileDraws(tile, painted, elements, { angle, tileSize: map.tileSize }));
    const duneDraws = draws.filter(draw => draw.source === 'dunes-atlas.webp');
    expect(duneDraws).toHaveLength(1);
    const center = view.projectGrid([3, 3], { angle, tileSize: map.tileSize });
    expect(duneDraws[0].position[0] + duneDraws[0].rect[2] / 2).toBe(center[0]);
    expect(duneDraws[0].position[1] + duneDraws[0].rect[3]).toBe(center[1] + 3 * 20 - 8 * 40);
  }
  const exported = maps.exportMapDefinition(JSON.parse(JSON.stringify(painted)), elements); expect(exported.issues).toEqual([]);
  expect(resolve(maps.importMapDefinition(exported.json, elements).definition).tiles).toEqual(resolve(painted).tiles);
  const erased = dunes.applyStroke(painted, [[3, 3]], true).definition;
  expect(erased.cells[3][3].dune).toBeUndefined(); expect(resolve(erased).tiles.filter(tile => tile.duneSize === 3)).toHaveLength(0);
  expect(dunes.applyStroke(map, [[2, 2], [99, 99]], false).definition).toBeNull();
});

test('2×2沙丘四镜头保持占地中心和地面底边', () => {
  const map = makeMap();
  for (let y = 2; y < 4; y++) for (let x = 2; x < 4; x++) map.cells[y][x].dune = true;
  for (const angle of [0, 90, 180, 270]) {
    const result = resolve(map, angle); expect(result.issues).toEqual([]);
    const draws = result.tiles.flatMap(tile => rendering.resolveTileDraws(tile, map, elements, { angle, tileSize: map.tileSize }))
      .filter(draw => draw.source === 'dunes-atlas.webp');
    expect(draws).toHaveLength(1);
    const center = view.projectGrid([2.5, 2.5], { angle, tileSize: map.tileSize });
    expect(draws[0].position[0] + draws[0].rect[2] / 2).toBe(center[0]);
    expect(draws[0].position[1] + draws[0].rect[3]).toBe(center[1] + 2 * 20 - 8 * 40);
  }
});

test('水、道路、坡面、实体和冲突拒绝，沙丘参与原环境传播', () => {
  for (const extra of [{ terrain: 'water' }, { road: 'ordinary' }, { rock: 'ordinary' }, { tree: 'ordinary-stump' }, { quarry: true }]) {
    const map = makeMap(); Object.assign(map.cells[3][3], extra, { dune: true });
    expect(resolve(map).issues.length).toBeGreaterThan(0);
  }
  const map = makeMap(); map.cells[3][3].dune = true;
  expect(dunes.resolve(map, ground(map), elements, new Map([['3,3', true]])).issues[0].code).toBe('dune-occupied');
  const invalid = makeMap(); invalid.cells[3][3].dune = false;
  expect(resolve(invalid).issues[0].code).toBe('dune-value');
  const missing = { ...elements, 'emperor-dune-1138': undefined };
  map.cells[3][3].terrainVariant = 0;
  expect(dunes.resolve(map, ground(map), missing, new Map()).issues[0].code).toBe('missing-dune-element');
  const cells = Array.from({ length: 3 }, () => Array.from({ length: 12 }, () => ({ terrain: 'land' })));
  cells[1][0].terrain = 'water'; cells[1][6].dune = true;
  const moist = environment.deriveMoisture(cells, 'arid');
  expect(moist[1][6]).toBe(0); expect(moist[1][0]).toBe(100);
});
