import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';
import * as maps from '../src/maps';
import * as view from '../src/isometric-view';
import { resolveElementDraw } from '../src/element-rendering/draw';
import { validateElementDefinition } from '../src/elements';

const read = file => fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

async function preview(mutate = () => {}) {
  const { window } = new JSDOM(read('element-editor.html'), { url: 'http://localhost/demo/element-editor.html' });
  const get = id => window.document.getElementById(id);
  const snapshots = [];
  window.fetch = async url => {
    const name = new URL(url).pathname.replace('/demo/', '');
    const value = JSON.parse(read(name));
    mutate(name, value);
    snapshots.push([value, JSON.stringify(value)]);
    return { ok: true, json: async () => value };
  };
  window.qtiledMaps = maps;
  window.qtiledView = view;
  const sourceInfo = {};
  for (const [file, folder] of [['atlas.png', 'emperor-land-water'], ['elevation-atlas.png', 'emperor-elevation']]) {
    const png = fs.readFileSync(path.join(__dirname, `../demo/static/terrain-samples/${folder}/${file}`));
    sourceInfo[file] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  }
  window.qtiledElementRendering = { resolveElementDraw, validateElementDefinition, loadElementSources: async () =>
    ({ sources: { 'atlas.png': {}, 'elevation-atlas.png': {} }, sourceInfo, issues: [] }) };
  const drawImage = jest.fn();
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {} });
  const context = vm.createContext({ window, document: window.document, URL, Option: window.Option, fetch: window.fetch });
  for (const file of ['land-water-rules', 'elevation-rules', 'elevation-rendering', 'elevation-context-preview']) {
    vm.runInContext(read(`static/js/${file}.js`), context);
  }
  get('context-reload').click();
  await settle();
  return { window, get, snapshots, drawImage };
}

test('四类世界形态由共用规则选图，四向锚点与所属格一致，切换不改输入', async () => {
  const p = await preview();
  expect(p.get('context-sample').disabled).toBe(false);
  for (const [id, records, grid] of [
    ['edge', [228, 222, 224, 226], [12, 2]],
    ['corner', [227, 221, 223, 225], [6, 7]],
    ['cliff', [208, 202, 204, 206], [12, 7]],
  ]) {
    p.get('context-sample').value = id;
    p.get('context-sample').dispatchEvent(new p.window.Event('change'));
    const figures = [...p.get('context-views').children];
    expect(figures.map(figure => figure.dataset.element)).toEqual(records.map(record => `emperor-elevation-${record}`));
    figures.forEach(figure => {
      const definitions = JSON.parse(read('static/terrain-samples/emperor-elevation/elements.json'));
      expect(JSON.parse(figure.dataset.anchor)).toEqual(definitions[figure.dataset.element].views[figure.dataset.angle].anchor);
      expect(JSON.parse(figure.dataset.grid)).toEqual(grid);
    });
  }
  p.get('context-sample').value = 'concave';
  p.get('context-sample').dispatchEvent(new p.window.Event('change'));
  expect(p.get('context-views').children).toHaveLength(4);
  expect(p.get('context-status').textContent).toContain('一级凹角');
  p.snapshots.forEach(([value, before]) => expect(JSON.stringify(value)).toBe(before));
  expect(p.drawImage).toHaveBeenCalled();
  p.window.close();
});

test('缺少规则所需图片定义时不显示半套方向，补回后可以重新载入', async () => {
  let missing = true;
  const p = await preview((name, value) => {
    if (missing && name.endsWith('emperor-elevation/elements.json')) delete value['emperor-elevation-228'];
  });
  expect(p.get('context-status').textContent).toContain('缺少高程元素');
  expect(p.get('context-views').children).toHaveLength(0);
  expect(p.get('context-sample').disabled).toBe(true);
  missing = false;
  p.get('context-reload').click();
  await settle();
  expect(p.get('context-views').children).toHaveLength(4);
  expect(p.get('context-sample').disabled).toBe(false);
  p.window.close();
});

test('四向上下文整体抬升到高平台不改变原图与锚点', async () => {
  const p = await preview((name, value) => {
    if (name.endsWith('elevation-multilevel-map.json')) value.cells.forEach(row => row.forEach(cell => { if (cell) cell.elevation += 8; }));
  });
  expect(p.get('context-status').textContent).toContain('高度 8');
  expect([...p.get('context-views').children].map(figure => figure.dataset.element))
    .toEqual([228, 222, 224, 226].map(record => `emperor-elevation-${record}`));
  p.snapshots.forEach(([value, before]) => expect(JSON.stringify(value)).toBe(before));
  p.window.close();
});
