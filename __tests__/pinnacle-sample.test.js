import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createHash } from 'crypto';
import { imagePixels } from '../test-utils/image-pixels';
import * as maps from '../src/maps';
import { projectGrid } from '../src/isometric-view';
import { resolveElementDraw } from '../src/element-rendering/draw';

const read = file => fs.readFileSync(path.join(__dirname, '../demo/static', file));
const elements = { ...JSON.parse(read('terrain-samples/emperor-land-water/elements.json')),
  ...JSON.parse(read('construction-samples/elements.json')) };
const sample = () => JSON.parse(read('map-samples/pinnacle-map.json'));
const context = vm.createContext({ window: { qtiledMaps: maps } });
['terrain-sample', 'environment-rules', 'land-water-rules', 'construction-rules'].forEach(name => vm.runInContext(read(`js/${name}.js`).toString(), context));
const { validate, canCoexist } = context.window.constructionRules;
const ground = map => map.cells.flatMap((row, y) => row.map((cell, x) => ({ grid: [x, y], elevation: cell?.elevation })));
// 独立原作解码和四张原PNG逐字节相同；期望摘要不从待测WebP生成。
const hashes = [
  '5c9a21780e08f00585aa2327fe008920b048442cb0c4ee32b693c8e07c3c0629',
  '1044683f036a79e093af42b902673e60194d175ca8c04ecf5d3a73f3ac3bcb51',
  'b46bc3ebb0e8e54f4b59fe867171739cd8484c2b55862adef59726d7a0421759',
  '0cf4a2c4646f800bf899136474de545b3d5d88684ad9c16ed5d0039e67ae5b30',
];

test('四张原图的完整RGBA、透明像素和四镜头5×5底面对齐', () => {
  const pixels = imagePixels(read('terrain-samples/emperor-land-water/pinnacles-atlas.webp'));
  expect([pixels.width, pixels.height]).toEqual([1598, 544]);
  hashes.forEach((hash, i) => {
    const element = elements[`emperor-pinnacle-${i + 1}`];
    const rect = [i * 400, 0, 398, [520, 544, 468, 475][i]];
    const rgba = Buffer.concat(Array.from({ length: rect[3] }, (_, y) => Buffer.from(pixels.data.slice(
      (y * pixels.width + rect[0]) * 4, (y * pixels.width + rect[0] + rect[2]) * 4))));
    expect(createHash('sha256').update(rgba).digest('hex')).toBe(hash);
    expect(rgba[3]).toBe(0);
    expect(element.kind).toBe('sprite');
    expect(new Set(element.footprint.map(String)).size).toBe(25);
    for (const angle of [0, 90, 180, 270]) {
      const view = { tileSize: [80, 40], angle };
      const draw = resolveElementDraw(element, [7, 8], view);
      expect(draw.rect).toEqual(rect);
      expect(draw.source).toBe('pinnacles-atlas.webp');
      expect(draw.footprint.map(item => item.grid)).toEqual(element.footprint.map(([x, y]) => [x + 7, y + 8]));
      expect([draw.position[0] + 199, draw.position[1] + rect[3] - 100]).toEqual(projectGrid([9, 10], view));
    }
  });
});

test('山峰独占25格，清除释放完整占地且不修改地表，JSON往返保持四种外观', () => {
  const map = sample();
  const occupied = maps.buildMapOccupancy(map, elements, canCoexist);
  expect(occupied.issues).toEqual([]);
  expect(occupied.index.size).toBe(100);
  const cleared = maps.applyMapEdit(map, { type: 'remove', id: 'pinnacle-1' }, elements, canCoexist);
  expect(cleared.issues).toEqual([]);
  expect(cleared.index.size).toBe(75);
  expect(cleared.definition.cells).toEqual(map.cells);
  expect(maps.importMapDefinition(maps.exportMapDefinition(map, elements).json, elements).definition).toEqual(map);
});

test.each(['water', 'road', 'height', 'outside', 'null', 'entity', 'slope'])('山峰拒绝 %s 占地冲突', conflict => {
  const map = sample();
  if (conflict === 'water') map.cells[6][5].terrain = 'water';
  if (conflict === 'road') map.cells[6][5].road = 'ordinary';
  if (conflict === 'height') map.cells[6][5].elevation++;
  if (conflict === 'outside') map.entities[0].grid = [22, 22];
  if (conflict === 'null') map.cells[6][5] = null;
  if (conflict === 'entity') map.entities.push({ id: 'house', element: 'courtyard-house', grid: [4, 5], angle: 0 });
  const tiles = ground(map);
  if (conflict === 'slope') tiles.find(tile => String(tile.grid) === '5,6').slope = true;
  expect(validate(map, tiles, elements).issues.length).toBeGreaterThan(0);
});
