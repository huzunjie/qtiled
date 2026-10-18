import fs from 'fs';
import vm from 'vm';
import * as maps from '../src/maps';
import * as view from '../src/isometric-view';
import { resolveElementDraw } from '../src/element-rendering/draw';
import { imagePixels } from '../test-utils/image-pixels';
const read = name => fs.readFileSync(`${__dirname}/../demo/${name}`, 'utf8');
const elements = JSON.parse(read('static/construction-samples/elements.json'));
const context = vm.createContext({ window: { qtiledMaps: maps, qtiledView: view, qtiledElementRendering: { resolveElementDraw } } });
['terrain-sample', 'environment-rules', 'land-water-rules', 'water-crossing-rules', 'construction-rules'].forEach(name => vm.runInContext(read(`static/js/${name}.js`), context));
const rules = context.window.waterCrossingRules;
const sample = () => JSON.parse(read('static/map-samples/water-crossing-map.json'));
const tiles = map => map.cells.flatMap((row, y) => row.map((cell, x) => ({ grid: [x, y], elevation: cell.elevation })));
const empty = map => ({ ...map, entities: [] });

test('正式样本有完整桥与错位渡口，配对与JSON往返合法', () => {
  const map = sample();
  expect(maps.importMapDefinition(JSON.stringify(map), elements).issues).toEqual([]);
  expect(rules.validate(map, elements, tiles(map)).issues).toEqual([]);
  expect(context.window.constructionRules.validate(map, tiles(map), elements).issues).toEqual([]);
  for (const angle of [0, 90, 180, 270]) for (const entity of map.entities) {
    const draws = rules.draws(entity, map, elements, { tileSize: [80, 40], angle });
    expect(draws.length).toBe(rules.isBridge(entity.element) ? elements[entity.element].footprint.length * 2 : 2);
    expect(draws.every(draw => draw.position.every(Number.isFinite))).toBe(true);
  }
});

test('桥长度1～7，两轴和四向选图；8格拒绝，整桥删除保水保路', () => {
  for (const axis of ['x', 'y']) for (const length of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const map = { ...empty(sample()), cells: Array.from({ length: 14 }, (_, y) => Array.from({ length: 14 }, (_, x) => ({ terrain: (axis === 'x' ? x : y) >= 3 && (axis === 'x' ? x : y) < 3 + length ? 'water' : 'land', elevation: 8 }))) };
    const grid = axis === 'x' ? [3, 6] : [6, 3];
    const result = rules.bridgeAt(map, grid, elements, tiles(map));
    expect(Boolean(result.entity)).toBe(length <= 7);
    if (!result.entity) continue;
    expect(result.entity.element).toBe(`bridge-${axis}-${length}`);
    map.entities = [result.entity];
    expect(rules.validate(map, elements, tiles(map)).issues).toEqual([]);
    for (const angle of [0, 90, 180, 270]) {
      const draws = rules.draws(result.entity, map, elements, { tileSize: [80, 40], angle });
      expect(draws).toHaveLength(length * 2);
      for (let i = 0; i < draws.length; i += 2) expect(Number(draws[i + 1].id.split('-').pop()) - Number(draws[i].id.split('-').pop())).toBe(56);
    }
    expect(rules.remove(map, [result.entity.id]).cells).toBe(map.cells);
    expect(rules.remove(map, [result.entity.id]).entities).toEqual([]);
  }
});

test('桥拒绝离岸、相邻桥、坡岸、高差、实体和地物占位', () => {
  const map = empty(sample());
  expect(rules.bridgeAt(map, [9, 5], elements).entity).toBeUndefined();
  for (const field of ['tree', 'road', 'cityWall']) {
    const blocked = empty(sample()); blocked.cells[5][8][field] = true;
    expect(rules.bridgeAt(blocked, [8, 5], elements).entity).toBeUndefined();
  }
  expect(rules.bridgeAt(map, [8, 5], elements, [{ grid: [7, 5], slope: true }]).entity).toBeUndefined();
  map.cells[5][7].elevation = 1;
  expect(rules.bridgeAt(map, [8, 5], elements).entity).toBeUndefined();
  expect(rules.bridgeAt(sample(), [8, 6], elements).entity).toBeUndefined();
});

test('渡口须匹配混合岸线与水面余量，配对拒绝缺端、同向、错高与越界', () => {
  const map = empty(sample());
  const first = rules.ferryAt(map, [20, 20], elements).entity;
  expect(first.element).toBe('ferry-0');
  expect(rules.ferryCandidates(map, first, elements).some(entity => String(entity.grid) === '22,10')).toBe(true);
  expect(rules.ferryAt(map, [0, 0], elements).entity).toBeUndefined();
  map.cells[19][20].terrain = 'land';
  expect(rules.ferryAt(map, [20, 20], elements).entity).toBeUndefined();
  const broken = sample(); broken.entities = broken.entities.filter(entity => entity.id !== 'ferry-1-opposite');
  expect(rules.validate(broken, elements, tiles(broken)).issues.length).toBeGreaterThan(0);
  for (const id of ['ferry-1', 'ferry-1-opposite']) {
    const before = sample(), after = rules.remove(before, [id]);
    expect(after.entities).toEqual(before.entities.filter(entity => !['ferry-1', 'ferry-1-opposite'].includes(entity.id)));
    expect(after.cells).toBe(before.cells);
  }
});

test('全部真实素材保留透明像素，桥前栏杆与主体裁切尺寸相同', () => {
  const pixels = imagePixels(fs.readFileSync(`${__dirname}/../demo/static/construction-samples/water-crossing-atlas.webp`));
  for (let id = 1934; id <= 1989; id++) {
    const a = elements[`crossing-part-${id}`].views[0], b = elements[`crossing-part-${id + 56}`].views[0];
    expect(a.rect.slice(2)).toEqual(b.rect.slice(2));
    const alpha = [];
    for (let y = b.rect[1]; y < b.rect[1] + b.rect[3]; y++) for (let x = b.rect[0]; x < b.rect[0] + b.rect[2]; x++) alpha.push(pixels.data[(y * pixels.width + x) * 4 + 3]);
    expect(alpha.some(value => value === 0)).toBe(true);
    expect(alpha.some(value => value > 0)).toBe(true);
    // 阴影仅留在主体上，前栏杆不可重复叠加半透明阴影。
    expect(alpha.some(value => value > 0 && value < 255)).toBe(false);
    const bodyAlpha = [];
    for (let y = a.rect[1]; y < a.rect[1] + a.rect[3]; y++) for (let x = a.rect[0]; x < a.rect[0] + a.rect[2]; x++) bodyAlpha.push(pixels.data[(y * pixels.width + x) * 4 + 3]);
    expect(bodyAlpha.every(value => [0, 128, 255].includes(value))).toBe(true);
  }
  // 长桥拱洞及木桥下方均使用实际 WebP 半透明像素。
  for (const id of [1934, 1947, 1948]) {
    const [left, top, width, height] = elements[`crossing-part-${id}`].views[0].rect;
    let shadowPixels = 0;
    for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) if (pixels.data[(y * pixels.width + x) * 4 + 3] === 128) shadowPixels++;
    expect(shadowPixels).toBeGreaterThan(40);
  }
});

test('断开的水域、异高对岸及被坡面占据的码头不允许配对', () => {
  const map = empty(sample());
  const first = rules.ferryAt(map, [20, 20], elements).entity;
  map.cells[15].forEach(cell => { cell.terrain = 'land'; });
  expect(rules.ferryCandidates(map, first, elements).some(entity => entity.grid[1] === 10)).toBe(false);
  const raised = empty(sample());
  for (const grid of rules.grids(sample().entities[2], elements)) raised.cells[grid[1]][grid[0]].elevation = 1;
  expect(rules.ferryCandidates(raised, first, elements).some(entity => String(entity.grid) === '22,10')).toBe(false);
  expect(rules.ferryAt(empty(sample()), [20, 20], elements, [{ grid: [21, 21], slope: true }]).entity).toBeUndefined();
});
