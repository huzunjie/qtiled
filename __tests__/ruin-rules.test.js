import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createHash } from 'crypto';
import { imagePixels } from '../test-utils/image-pixels';
import * as maps from '../src/maps';
import * as view from '../src/isometric-view';
import { resolveElementDraw } from '../src/element-rendering/draw';

const read = file => fs.readFileSync(path.join(__dirname, '../demo/static', file));
const elements = JSON.parse(read('terrain-samples/emperor-land-water/elements.json'));
const sample = () => JSON.parse(read('map-samples/ruins-map.json'));
const context = vm.createContext({ window: { qtiledView: view, qtiledElementRendering: { resolveElementDraw } } });
['terrain-sample', 'ruin-rules', 'elevation-rendering'].forEach(name => vm.runInContext(read(`js/${name}.js`).toString(), context));
const { ruinRules: ruins, elevationRendering: rendering } = context.window;
const resolve = map => ruins.resolve(map, map.cells.flatMap((row, y) => row.map((cell, x) => ({ grid: [x, y], elevation: cell.elevation, element: 'emperor-bare-land' }))), elements, new Map());
// 摘要来自原SG解码与12张PNG逐字节核对，不由待测WebP生成。
const hashes = [
  '4c8851705bf0a4191c5ca08315d70d4a6c7659bb3cf0aaf20ce4006d6adc9cf1',
  '93680c8bcc43bbd0a32374c5e725ad57d13fdbb5a58ad175044461fa93666749',
  '23c5fd8e1fc49de36a00864b25e59e8107527e8d4e39d65f719f126a0bd064b7',
  'bfe356a038f3e79fcbaf6366864926fe10c57e4627c3c01a2e1923609d209259',
  '08777d986b195d5c9daae4a4fdca73fd3561d4e769a39eb1801eff76a15e26bd',
  'e5d98a41d07c217b3a9607b67eff0784e4af33b5609a82ee17eab30c065dfcd8',
  '6404884c5ebad320afd7923bf4d97cf01af7edfeca57c7bfca3ee7b195ccba8c',
  'f682c9153115bf5ed9ae56967c4fa1a99960a5a3eda4b25feb2c78cdf5cac40e',
  '6c9317197a751713b0fa7e37ab4182da04cc71ca79d6cdac204e232fa6beafac',
  '060ea7bda6dc4add684904ac715fd48b69ce3b28d632c55dda5f418b156c79f8',
  '64bc123bd59d6500c1e09d329e9d16505eab1c698689cefceb2304cc923e12f1',
  '7c1d645ff5d9a97ee369aaaf875141dcb62d01a521e6226a57257372ee3533c8'
];

test('12张遗迹保留原作完整RGBA，8张单格及4张四格，四向底座中心一致', () => {
  const pixels = imagePixels(read('terrain-samples/emperor-land-water/ruins-atlas.webp'));
  expect([pixels.width, pixels.height]).toEqual([1278, 94]);
  hashes.forEach((hash, i) => {
    const element = elements[`emperor-ruin-${1126 + i}`];
    const [x, y, w, h] = element.views[0].rect;
    const rgba = Buffer.concat(Array.from({ length: h }, (_, row) => Buffer.from(pixels.data.slice(((y + row) * pixels.width + x) * 4, ((y + row) * pixels.width + x + w) * 4))));
    expect(createHash('sha256').update(rgba).digest('hex')).toBe(hash);
    const size = i < 8 ? 1 : 2;
    expect(element.footprint).toHaveLength(size * size);
    for (const angle of [0, 90, 180, 270]) {
      const camera = { angle, tileSize: [80, 40] };
      const draw = resolveElementDraw(element, [4, 5], camera);
      expect([draw.position[0] + w / 2, draw.position[1] + h - size * 20]).toEqual(view.projectGrid([4 + (size - 1) / 2, 5 + (size - 1) / 2], camera));
    }
  });
});

test('样本12种外观四向稳定，按格擦除2×2后重组，JSON只保存逐格事实', () => {
  const map = sample();
  const result = resolve(map); expect(result.issues).toEqual([]);
  for (const angle of [0, 90, 180, 270]) {
    const draws = result.tiles.flatMap(tile => tile.ruin ? rendering.resolveTileDraws(tile, map, elements, { angle, tileSize: map.tileSize }) : []);
    expect(draws.map(draw => draw.id).sort()).toEqual(hashes.map((_, i) => `emperor-ruin-${1126 + i}`).sort());
  }
  const cleared = ruins.applyStroke(map, [[2, 9]], true).definition;
  expect(cleared.cells[9][2].ruin).toBeUndefined();
  expect(resolve(cleared).tiles.filter(tile => tile.ruinSize === 2)).toHaveLength(12);
  expect(maps.importMapDefinition(maps.exportMapDefinition(JSON.parse(JSON.stringify(cleared)), elements).json, elements).definition).toEqual(cleared);
  expect(ruins.applyStroke(map, [[99, 99]], false).issues.length).toBeGreaterThan(0);
});

test.each([{ terrain: 'water' }, { beach: true }, { road: 'ordinary' }, { tree: 'ordinary-stump' }, { rock: 'ordinary' }, { dune: true }, { quarry: true }, { saltMarsh: true }, { ruin: false }])('遗迹拒绝冲突 %j', extra => {
  const map = sample(); Object.assign(map.cells[2][2], extra);
  expect(resolve(map).issues.length).toBeGreaterThan(0);
});

test('遗迹拒绝坡面和实体占地', () => {
  const map = sample();
  const tiles = [{ grid: [2, 2], elevation: 8, slope: true }];
  expect(ruins.resolve(map, tiles, elements, new Map()).issues.length).toBeGreaterThan(0);
  expect(ruins.resolve(map, [{ ...tiles[0], slope: false }], elements, new Map([['2,2', ['house']]])).issues.length).toBeGreaterThan(0);
});
