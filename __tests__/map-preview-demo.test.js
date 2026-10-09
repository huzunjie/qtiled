import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';
import { shapes } from '../src';
import * as elements from '../src/elements';
import * as view from '../src/isometric-view';
import * as maps from '../src/maps';
import { renderElementPreview } from '../src/element-preview/spritejs-element-renderer';
import { Group, Sprite, Polyline, Label } from 'spritejs';

jest.mock('spritejs', () => {
  class Node {
    constructor(attrs = {}) { this.attrs = attrs; this.children = []; }
    append(child) { this.children.push(child); child.parent = this; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  return { Group: class extends Node {}, Sprite: class extends Node {}, Polyline: class extends Node {}, Label: class extends Node {} };
}, { virtual: true });

const read = file => fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

// 执行真实页面脚本和计算/渲染适配器，DOM、图片加载与 SpriteJS 节点使用替身。
async function page() {
  const { window } = new JSDOM(read('map-preview.html'), { url: 'http://localhost/demo/map-preview.html' });
  const get = id => window.document.getElementById(id);
  const faults = {};
  const layer = new Group();
  let imageBatch = 0;
  const resolve = jest.fn(maps.resolveMapEntities);
  window.spritejs = { Group, Sprite, Polyline, Label, Scene: class { layer() { return layer; } } };
  window.qtiled = { shapes };
  window.qtiledView = view;
  window.qtiledMaps = { ...maps, resolveMapEntities: resolve };
  window.qtiledPreview = { ...elements, renderElementPreview, loadElementSources: async files => {
    const sources = {};
    const sourceInfo = {};
    const batch = ++imageBatch;
    Object.keys(files).forEach(file => {
      const png = fs.readFileSync(path.join(__dirname, '../demo/static/element-samples/dog', file));
      sources[file] = { batch, file };
      sourceInfo[file] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    });
    return { sources, sourceInfo, issues: faults.image ? [{ path: 'images/sculpture_dog01.png', message: '图片加载失败' }] : [] };
  } };
  const fetch = jest.fn(async url => {
    const isMap = url.pathname.includes('/map-samples/');
    const value = JSON.parse(read(url.pathname.replace('/demo/', '')));
    if (isMap && faults.map) value.entities[0].element = 'missing';
    if (!isMap && faults.definition) delete value.views[90];
    if (isMap && faults.delay) await faults.delay;
    return { ok: !faults.http, status: 404, json: async () => {
      if (faults.json) throw new Error('bad JSON');
      return value;
    } };
  });
  const context = vm.createContext({ window, document: window.document, URL, fetch });
  vm.runInContext(read('static/js/pointer.js'), context);
  vm.runInContext(read('static/js/map-preview.js'), context);
  await settle();
  const result = () => resolve.mock.results[resolve.mock.results.length - 1].value.entities;
  const sprites = () => layer.children.flatMap(root => root.children.flatMap(holder => holder.children.flatMap(group => group.children))).filter(node => node instanceof Sprite);
  const clickGrid = grid => {
    const [, , currentView] = resolve.mock.calls[resolve.mock.calls.length - 1];
    const [x, y] = view.projectGrid(grid, currentView);
    // 包含滚动后的容器偏移，覆盖共用指针工具的坐标链。
    get('map-canvas').getBoundingClientRect = () => ({ left: -100, top: 73 });
    get('map-canvas').dispatchEvent(new window.MouseEvent('click', { clientX: x - 100, clientY: y + 73 }));
  };
  const camera = angle => window.document.querySelector(`[data-angle="${angle}"]`).click();
  const mode = value => { get('pick-mode').value = value; get('pick-mode').dispatchEvent(new window.Event('change')); };
  const reload = async () => { get('reload').click(); await settle(); };
  return { window, get, faults, layer, result, sprites, clickGrid, camera, mode, reload, resolve, fetch };
}

test('独立加载部署样本，绘制 20 个有效格、四空角及两个独立图片', async () => {
  const p = await page();
  expect(p.get('controls').disabled).toBe(false);
  expect(p.get('map-summary').textContent).toBe('4 行 × 6 列 · 20 有效格 · 2 实体');
  const tiles = p.layer.children[0].children.filter(node => node instanceof Polyline);
  expect(tiles.filter(node => node.attrs.fillColor === '#e0edd9')).toHaveLength(20);
  expect(tiles.filter(node => node.attrs.lineDash.length)).toHaveLength(4);
  expect(p.sprites()).toHaveLength(2);
  expect(p.sprites()[0].attrs.pos).not.toEqual(p.sprites()[1].attrs.pos);
  expect(p.fetch.mock.calls.every(([url]) => url.pathname.startsWith('/demo/static/'))).toBe(true);
});

test('四镜头保留两个姿态和全部占地；选中实例保持，素材逐向切换', async () => {
  const p = await page();
  const pose = entities => entities.map(({ id, grid, angle, draw }) => ({ id, grid, angle, cells: draw.footprint.map(item => item.grid) }));
  const before = pose(p.result());
  p.clickGrid([2, 2]);
  expect(p.get('entity-id').textContent).toBe('dog-a');
  for (const angle of [0, 90, 180, 270]) {
    p.camera(angle);
    expect(pose(p.result())).toEqual(before);
    expect(p.sprites()).toHaveLength(2);
    expect(p.result().every(entity => entity.draw.imageAngle === angle)).toBe(true);
    expect(p.get('entity-id').textContent).toBe('dog-a');
    expect(p.get('entity-footprint').textContent).toBe('[1,1] [2,1] [1,2] [2,2]');
    expect(p.layer.children[0].children.filter(node => node.attrs.strokeColor === '#1976b5')).toHaveLength(4);
    p.clickGrid([4, 2]);
    expect(p.get('entity-id').textContent).toBe('dog-b');
    p.clickGrid([1, 1]);
  }
});

test('格子模式可查看实体下格属性，空角和矩阵外可区分，切镜头保留世界格', async () => {
  const p = await page();
  p.mode('cell');
  p.clickGrid([1, 1]);
  expect(p.get('cell-info').textContent).toContain('terrain: land');
  expect(p.get('entity-id').textContent).toBe('—');
  p.camera(90);
  expect(p.get('cell-grid').textContent).toBe('[1,1]');
  p.clickGrid([0, 0]);
  expect(p.get('cell-info').textContent).toBe('null · 无效空角');
  p.clickGrid([-1, 0]);
  expect(p.get('cell-info').textContent).toBe('地图矩阵之外');
});

test.each([
  ['http', 'HTTP 404'], ['json', '不是有效 JSON'], ['map', 'entities[0].element'],
  ['definition', 'views.90'], ['image', 'images/sculpture_dog01.png'],
])('%s 失败清空旧数据与图像，修复后同页重载恢复', async (fault, message) => {
  const p = await page();
  p.clickGrid([1, 1]);
  p.faults[fault] = true;
  await p.reload();
  expect(p.get('issues').hidden).toBe(false);
  expect(p.get('issues').textContent).toContain(message);
  expect(p.get('controls').disabled).toBe(true);
  expect(p.get('map-id').textContent).toBe('—');
  expect(p.get('entity-id').textContent).toBe('—');
  expect(p.layer.children).toHaveLength(0);
  delete p.faults[fault];
  await p.reload();
  expect(p.get('issues').hidden).toBe(true);
  expect(p.get('controls').disabled).toBe(false);
  expect(p.sprites()).toHaveLength(2);
  expect(p.sprites().every(node => node.attrs.texture.batch === 3)).toBe(true);
});

test('较早的坏加载延迟返回，不覆盖后一次成功场景', async () => {
  const p = await page();
  let finish;
  p.faults.delay = new Promise(resolve => { finish = resolve; });
  p.faults.map = true;
  await p.reload();
  expect(p.layer.children).toHaveLength(0);
  expect(p.get('controls').disabled).toBe(true);
  delete p.faults.delay;
  delete p.faults.map;
  await p.reload();
  finish();
  await settle();
  expect(p.get('issues').hidden).toBe(true);
  expect(p.sprites()).toHaveLength(2);
  expect(p.sprites().every(node => node.attrs.texture.batch === 3)).toBe(true);
});
