import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { JSDOM } from 'jsdom';
import * as elements from '../src/elements';
import * as view from '../src/isometric-view';
import * as maps from '../src/maps';
import { resolveElementDraw } from '../src/element-rendering/draw';
import { resolveElementFrame } from '../src/element-rendering/frame';
import { renderElement, updateElementFrame } from '../src/element-rendering/spritejs-element-renderer';
import { Group, Sprite, Polyline, Label } from 'spritejs';

jest.mock('spritejs', () => {
  class Node {
    constructor(attrs = {}) { this.attrs = attrs; this.children = []; }
    attr(attrs) { Object.assign(this.attrs, attrs); }
    append(...children) { children.forEach(child => { this.children.push(child); child.parent = this; }); }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  return { Group: class extends Node {}, Sprite: class extends Node {}, Polyline: class extends Node {}, Label: class extends Node {} };
}, { virtual: true });

const read = file => fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

// 执行真实页面脚本和计算/渲染适配器，DOM、图片加载与 SpriteJS 节点使用替身。
async function page(initialFaults = {}, sample = 'first-static-map') {
  const { window } = new JSDOM(read('map-editor.html'), { url: 'http://localhost/demo/map-editor.html' });
  const get = id => window.document.getElementById(id);
  if (sample !== null) get('map-sample').value = sample;
  const errors = [];
  window.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  const faults = { ...initialFaults };
  const layer = new Group();
  const contentLayers = [];
  const canvasContext = { imageSmoothingEnabled: true };
  layer.canvas = { getContext: () => canvasContext };
  const size = { width: 800, height: 500, ...initialFaults.viewportSize };
  const container = get('map-canvas');
  Object.defineProperties(container, {
    clientWidth: { get: () => size.width },
    clientHeight: { get: () => size.height },
  });
  container.getBoundingClientRect = () => ({ left: -100, top: 73, width: size.width, height: size.height });
  const captured = new Set();
  container.setPointerCapture = id => captured.add(id);
  container.hasPointerCapture = id => captured.has(id);
  container.releasePointerCapture = id => captured.delete(id);
  const observers = [];
  class ResizeObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.target = null; }
  }
  let scene;
  let imageBatch = 0;
  const resolve = jest.fn(maps.resolveMapEntities);
  const importMap = jest.fn(maps.importMapDefinition);
  const occupancy = jest.fn(maps.buildMapOccupancy);
  const resolveFrame = jest.fn(resolveElementFrame);
  const updateFrame = jest.fn(updateElementFrame);
  let now = 0;
  let requestId = 0;
  const callbacks = new Map();
  window.spritejs = { Group, Sprite, Polyline, Label, Layer: class extends Group {
    constructor(options) {
      super();
      this.options = options;
      this.canvas = options.canvas;
      const context = { imageSmoothingEnabled: true };
      this.canvas.getContext = () => context;
      this.setResolution = jest.fn(({ width, height }) => { this.canvas.width = width; this.canvas.height = height; });
      this.render = jest.fn(() => { if (faults.raster) throw new Error('原尺寸合成失败'); });
      contentLayers.push(this);
    }
  }, Scene: class {
    constructor(options) {
      this.options = options;
      this.resize = jest.fn(() => { canvasContext.imageSmoothingEnabled = true; });
      scene = this;
    }
    layer() { return layer; }
  } };
  Sprite.prototype.forceUpdate = jest.fn();
  window.ResizeObserver = ResizeObserver;
  window.qtiledView = view;
  // 计算模块来自 Jest realm，工具脚本来自 VM；JSON 文件在实际浏览器属于同一 realm。
  const exportMap = jest.fn((map, library) => maps.exportMapDefinition(JSON.parse(JSON.stringify(map)), library));
  window.qtiledMaps = { ...maps, resolveMapEntities: resolve, importMapDefinition: importMap,
    buildMapOccupancy: occupancy, exportMapDefinition: exportMap };
  window.qtiledElementRendering = { ...elements, renderElement, resolveElementDraw,
    resolveElementFrame: resolveFrame, updateElementFrame: updateFrame, loadElementSources: async files => {
    const sources = {};
    const sourceInfo = {};
    const batch = ++imageBatch;
    Object.keys(files).forEach(file => {
      const png = fs.readFileSync(path.join(__dirname, '../demo', files[file].split('?')[0]));
      sources[file] = { batch, file };
      sourceInfo[file] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    });
    return { sources, sourceInfo, issues: faults.image ? [{ path: 'images/sculpture_dog01.png', message: '图片加载失败' }] : [] };
  } };
  const fetch = jest.fn(async url => {
    const isMap = url.pathname.includes('/map-samples/');
    const value = JSON.parse(read(url.pathname.replace('/demo/', '')));
    if (isMap && faults.map) value.entities[0].element = 'missing';
    if (isMap && faults.cells) value.cells = null;
    if (isMap && faults.overlap) value.entities[1].grid = [1, 1];
    if (url.pathname.endsWith('/dog/element.json') && faults.definition) delete value.views[90];
    if (url.pathname.endsWith('/rules.json') && faults.rules) value.rows = [];
    if (url.pathname.endsWith('/emperor-land-water/elements.json') && faults.terrain) delete value['emperor-terrain-202'];
    if (url.pathname.endsWith('/emperor-land-water/elements.json') && faults.animation) value['emperor-water-deep'].sequences.water.frames[0].rect[2] = 99999;
    if (isMap && faults.delay) await faults.delay;
    return { ok: !faults.http, status: 404, text: async () => {
      if (faults.json) return '{broken';
      return JSON.stringify(value);
    } };
  });
  const url = class extends URL {};
  url.createObjectURL = jest.fn(() => 'blob:map');
  url.revokeObjectURL = jest.fn();
  window.HTMLAnchorElement.prototype.click = jest.fn();
  const context = vm.createContext({ window, document: window.document, URL: url, Blob: window.Blob, fetch, setTimeout, ResizeObserver,
    performance: { now: () => now },
    requestAnimationFrame: callback => { callbacks.set(++requestId, callback); return requestId; },
    cancelAnimationFrame: id => callbacks.delete(id),
  });
  vm.runInContext(read('static/js/pointer.js'), context);
  vm.runInContext(read('static/js/dog-element-sample.js'), context);
  vm.runInContext(read('static/js/land-water-rules.js'), context);
  const terrainResolve = jest.fn(window.landWaterRules.resolve);
  window.landWaterRules.resolve = terrainResolve;
  const terrainStroke = jest.fn(window.landWaterRules.applyStroke);
  window.landWaterRules.applyStroke = terrainStroke;
  vm.runInContext(read('static/js/element-animation-player.js'), context);
  vm.runInContext(read('static/js/map-editor.js'), context);
  await settle();
  const result = () => resolve.mock.results[resolve.mock.results.length - 1].value.entities;
  const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
  const contentLayer = () => contentLayers.find(item => item.canvas === layer.children[0]?.children[0].attrs.texture);
  const sprites = () => descendants(contentLayer()).filter(node => node instanceof Sprite && node.attrs.texture.file !== 'atlas.png');
  const terrainSprites = () => descendants(contentLayer()).filter(node => node instanceof Sprite && node.attrs.texture.file === 'atlas.png');
  const pointAt = grid => {
    const [map, , currentView] = resolve.mock.calls[resolve.mock.calls.length - 1];
    const local = view.projectGrid(grid, { ...currentView, tileSize: map.tileSize, originPixel: [0, 0] });
    const root = layer.children[0];
    const [x, y] = local.map((value, axis) => root.attrs.pos[axis] + value * (root.attrs.scale?.[axis] ?? 1));
    // 包含滚动后的容器偏移，覆盖共用指针工具的坐标链。
    return { clientX: x - 100, clientY: y + 73 };
  };
  const clickGrid = grid => get('map-canvas').dispatchEvent(new window.MouseEvent('click', pointAt(grid)));
  const sendPointer = (type, point, button = 0, pointerId = 1) => {
    const event = new window.MouseEvent(type, { ...point, button, buttons: type === 'pointerup' ? 0 : button === 1 ? 4 : 1, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    get('map-canvas').dispatchEvent(event);
    return event;
  };
  const pointer = (type, grid, button = 0) => sendPointer(type, pointAt(grid), button);
  const screenPointer = (type, point, button = 0) => sendPointer(type, { clientX: point[0] - 100, clientY: point[1] + 73 }, button);
  const tool = value => { get('edit-tool').value = value; get('edit-tool').dispatchEvent(new window.Event('change')); };
  const save = () => { get('save-map').click(); return JSON.parse(get('map-json').value); };
  const camera = angle => window.document.querySelector(`[data-angle="${angle}"]`).click();
  const mode = value => { get('pick-mode').value = value; get('pick-mode').dispatchEvent(new window.Event('change')); };
  const reload = async () => { get('reload').click(); await settle(); };
  const tiles = () => {
    const latest = [terrainResolve, terrainStroke].sort((a, b) =>
      (b.mock.invocationCallOrder.slice(-1)[0] || 0) - (a.mock.invocationCallOrder.slice(-1)[0] || 0))[0];
    return latest.mock.results[latest.mock.results.length - 1].value.tiles;
  };
  const advance = value => {
    now += value;
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach(callback => callback(now));
  };
  const resize = (width, height) => {
    Object.assign(size, { width, height });
    observers.filter(observer => observer.target).forEach(observer => observer.callback([{ target: observer.target, contentRect: { width, height } }]));
  };
  const worldCenter = () => {
    const root = layer.children[0];
    const currentView = resolve.mock.calls[resolve.mock.calls.length - 1][2];
    const pixel = [size.width / 2, size.height / 2].map((value, axis) => (value - root.attrs.pos[axis]) / root.attrs.scale[axis]);
    const a = view.projectGrid([1, 0], currentView);
    const b = view.projectGrid([0, 1], currentView);
    const determinant = a[0] * b[1] - a[1] * b[0];
    return [(pixel[0] * b[1] - pixel[1] * b[0]) / determinant, (a[0] * pixel[1] - a[1] * pixel[0]) / determinant];
  };
  return { window, get, faults, layer, result, sprites, terrainSprites, clickGrid, camera, mode, reload, resolve, importMap,
    fetch, pointer, tool, save, exportMap, terrainResolve, terrainStroke, resolveFrame, updateFrame, advance, callbacks, tiles, errors, descendants,
    size, resize, scene: () => scene, screenPointer, captured, worldCenter, occupancy, canvasContext, contentLayer };
}

function setDisplay(p, id, checked) {
  p.get(id).checked = checked;
  p.get(id).dispatchEvent(new p.window.Event('change'));
}

function guide(p, id) {
  return p.layer.children[0].children.find(node => node.attrs.id === id);
}

function zoom(p, value, enter = false) {
  p.get('zoom-percent').value = String(value);
  p.get('zoom-percent').dispatchEvent(enter
    ? new p.window.KeyboardEvent('keydown', { key: 'Enter' }) : new p.window.Event('change'));
}

test('奇数画布首次显示先完成整数原尺寸合成；平移缩放不重绘合成图，换帧才更新', async () => {
  const p = await page({ viewportSize: { width: 522, height: 477 } }, 'rectangular-water-map');
  const root = p.layer.children[0];
  const content = p.contentLayer();
  expect(root.attrs.pos[1] % 1).toBe(0.5);
  expect(root.children[0].attrs.pos.every(Number.isInteger)).toBe(true);
  expect(content.children[0].attrs.pos.every(Number.isInteger)).toBe(true);
  expect(content.options.autoRender).toBe(false);
  expect(content.canvas.getContext('2d').imageSmoothingEnabled).toBe(false);
  expect(content.render).toHaveBeenCalledTimes(1);
  expect(root.children[0].attrs.texture).toBe(content.canvas);
  const center = p.worldCenter();
  zoom(p, 83.5);
  p.tool('pan');
  p.screenPointer('pointerdown', [260, 230]);
  p.screenPointer('pointermove', [260.375, 230.25]);
  p.screenPointer('pointercancel', [260.375, 230.25]);
  expectNearPoint(p.worldCenter(), center);
  expect(content.render).toHaveBeenCalledTimes(1);
  p.advance(100);
  expect(content.render).toHaveBeenCalledTimes(2);
  expect(root.children[0].forceUpdate).toHaveBeenCalled();
  p.get('play-animation').click();
  p.advance(100);
  expect(content.render).toHaveBeenCalledTimes(2);
});

test('自定义缩放保留中心、四向选择和笔刷；全图与原尺寸同步比例，缩放不入地图', async () => {
  const p = await page({}, 'rectangular-water-map');
  const before = p.save();
  const center = p.worldCenter();
  zoom(p, 83.5, true);
  expect(p.layer.children[0].attrs.scale).toEqual([0.835, 0.835]);
  for (const angle of [0, 90, 180, 270]) {
    p.camera(angle);
    expectNearPoint(p.worldCenter(), center);
    p.clickGrid([16, 19]);
    expect(p.get('cell-grid').textContent).toBe('[16,19]');
    p.tool('water');
    p.pointer('pointerdown', [16, 19]);
    zoom(p, 200);
    expect(p.layer.children[0].attrs.scale).toEqual([0.835, 0.835]);
    p.pointer('pointerup', [16, 19]);
    expect(p.save().cells[19][16].terrain).toBe('water');
    p.get('undo').click();
    expect(p.save()).toEqual(before);
    p.tool('select');
  }
  p.get('fit-map').click();
  expect(p.get('zoom-percent').value).toBe(String(Math.round(p.layer.children[0].attrs.scale[0] * 1000) / 10));
  zoom(p, 125);
  p.resize(611, 479);
  expect(p.layer.children[0].attrs.scale).toEqual([1.25, 1.25]);
  expectNearPoint(p.worldCenter(), center);
  p.get('native-size').click();
  expect(p.get('zoom-percent').value).toBe('100');
  expect(p.save()).toEqual(before);
});

test('自定义比例边界与非法输入保留原有效视图，坐标显示随比例恢复', async () => {
  const p = await page({}, 'rectangular-water-map');
  setDisplay(p, 'show-coordinates', true);
  for (const percent of [10, 49.9, 50, 400]) {
    zoom(p, percent);
    expect(p.layer.children[0].attrs.scale).toEqual([percent / 100, percent / 100]);
    expect(guide(p, 'map-coordinate-overlay').attrs.display).toBe(percent < 50 ? 'none' : '');
  }
  for (const value of ['', 0, -1, 9.9, 400.1, 'NaN']) {
    zoom(p, value);
    expect(p.layer.children[0].attrs.scale).toEqual([4, 4]);
    expect(p.get('zoom-percent').value).toBe('400');
    expect(p.get('status').textContent).toContain('已保留原比例');
  }
});

test('合成失败保留旧有效地图、选择和历史，修正后恢复', async () => {
  const p = await page();
  const before = p.save();
  p.clickGrid([1, 1]);
  const root = p.layer.children[0];
  p.faults.raster = true;
  await p.reload();
  expect(p.layer.children[0]).toBe(root);
  expect(p.get('entity-id').textContent).toBe('dog-a');
  expect(p.get('issues').hidden).toBe(false);
  expect(p.save()).toEqual(before);
  delete p.faults.raster;
  await p.reload();
  expect(p.get('issues').hidden).toBe(true);
  expect(p.layer.children[0]).not.toBe(root);
});

test('地图使用像素采样，resize 重置 Canvas 状态后仍恢复；变换与世界中心不量化', async () => {
  const p = await page({}, 'rectangular-water-map');
  expect(p.canvasContext.imageSmoothingEnabled).toBe(false);
  p.tool('pan');
  p.screenPointer('pointerdown', [300, 220]);
  p.screenPointer('pointermove', [300.375, 220.25]);
  p.screenPointer('pointerup', [300.375, 220.25]);
  const center = p.worldCenter();
  expect(center.some(value => !Number.isInteger(value))).toBe(true);
  p.resize(701, 451);
  expect(p.scene().resize).toHaveBeenCalled();
  expect(p.canvasContext.imageSmoothingEnabled).toBe(false);
  expectNearPoint(p.worldCenter(), center);
});

test('网格与世界坐标独立开关，只覆盖有效格且不修改事实、规则、播放与撤销', async () => {
  const p = await page({}, 'rectangular-water-map');
  const root = p.layer.children[0];
  const map = p.save();
  const calls = [p.terrainResolve.mock.calls.length, p.resolve.mock.calls.length, p.occupancy.mock.calls.length];
  const grid = guide(p, 'map-grid-overlay');
  const coords = guide(p, 'map-coordinate-overlay');
  expect(grid.children).toHaveLength(0);
  expect(coords.children).toHaveLength(0);
  setDisplay(p, 'show-grid', true);
  expect(grid.attrs.display).toBe('');
  expect(grid.children).toHaveLength(544);
  expect(coords.attrs.display).toBe('none');
  setDisplay(p, 'show-coordinates', true);
  expect(coords.children).toHaveLength(544);
  expect(coords.children.some(node => node.attrs.text === '0,0')).toBe(false);
  const coordinate = coords.children.find(node => node.attrs.text === '18,12');
  expect(coordinate.attrs.pos).toEqual(view.projectGrid([18, 12], { tileSize: [80, 40] }));
  p.advance(200);
  expect(coords.children.find(node => node.attrs.text === '18,12')).toBe(coordinate);
  setDisplay(p, 'show-grid', false);
  expect(grid.attrs.display).toBe('none');
  expect(coords.attrs.display).toBe('');
  expect(p.layer.children[0]).toBe(root);
  expect([p.terrainResolve.mock.calls.length, p.resolve.mock.calls.length, p.occupancy.mock.calls.length]).toEqual(calls);
  expect(p.get('undo').disabled).toBe(true);
  expect(p.save()).toEqual(map);
});

test('辅助层在四向、缩放、笔刷和撤销后保持世界编号，坐标过密时提示并可恢复', async () => {
  const p = await page({}, 'rectangular-water-map');
  setDisplay(p, 'show-grid', true);
  setDisplay(p, 'show-coordinates', true);
  for (const angle of [0, 90, 180, 270]) {
    p.camera(angle);
    const label = guide(p, 'map-coordinate-overlay').children.find(node => node.attrs.text === '18,12');
    expect(label.attrs.pos).toEqual(view.projectGrid([18, 12], { angle, tileSize: [80, 40] }));
    p.tool('water'); p.pointer('pointerdown', [16, 19]); p.pointer('pointerup', [16, 19]);
    p.get('undo').click();
    expect(guide(p, 'map-grid-overlay').children).toHaveLength(544);
    expect(guide(p, 'map-coordinate-overlay').children.map(node => node.attrs.text)).toContain('18,12');
  }
  p.get('fit-map').click(); p.resize(400, 360);
  expect(p.get('show-coordinates').checked).toBe(true);
  expect(guide(p, 'map-coordinate-overlay').attrs.display).toBe('none');
  expect(p.get('coordinates-hint').hidden).toBe(false);
  p.get('native-size').click();
  expect(guide(p, 'map-coordinate-overlay').attrs.display).toBe('');
  expect(p.get('coordinates-hint').hidden).toBe(true);
  setDisplay(p, 'show-coordinates', false);
  expect(guide(p, 'map-coordinate-overlay').attrs.display).toBe('none');
  expect(guide(p, 'map-grid-overlay').attrs.display).toBe('');
});

test('独立加载部署样本，仅绘制 20 个有效格并显示两个独立图片', async () => {
  const p = await page();
  expect(p.get('controls').disabled).toBe(false);
  expect(p.get('map-summary').textContent).toBe('4 行 × 6 列 · 20 有效格 · 2 实体');
  expect(p.terrainSprites()).toHaveLength(20);
  expect(p.terrainSprites().every(node => node.attrs.sourceRect[3] === 41)).toBe(true);
  expect(p.sprites()).toHaveLength(2);
  expect(p.sprites()[0].attrs.pos).not.toEqual(p.sprites()[1].attrs.pos);
  expect(p.fetch.mock.calls.every(([url]) => url.pathname.startsWith('/demo/static/'))).toBe(true);
});

function expectNearPoint(actual, expected) {
  actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], 8));
}

function expectVisibleSprites(p) {
  const root = p.layer.children[0];
  for (const sprite of [...p.sprites(), ...p.terrainSprites()]) {
    const corner = sprite.attrs.pos.map((value, axis) => root.attrs.pos[axis] + value * root.attrs.scale[axis]);
    for (const axis of [0, 1]) {
      expect(corner[axis]).toBeGreaterThanOrEqual(-0.001);
      expect(corner[axis] + sprite.attrs.size[axis] * root.attrs.scale[axis]).toBeLessThanOrEqual((axis ? p.size.height : p.size.width) + 0.001);
    }
  }
  const currentView = p.resolve.mock.calls[p.resolve.mock.calls.length - 1][2];
  for (const tile of p.tiles()) {
    const center = view.projectGrid(tile.grid, currentView);
    for (const vertex of [[-40, 0], [40, 0], [0, -20], [0, 20]]) {
      const point = center.map((value, axis) => root.attrs.pos[axis] + (value + vertex[axis]) * root.attrs.scale[axis]);
      expect(point[0]).toBeGreaterThanOrEqual(-0.001);
      expect(point[1]).toBeGreaterThanOrEqual(-0.001);
      expect(point[0]).toBeLessThanOrEqual(p.size.width + 0.001);
      expect(point[1]).toBeLessThanOrEqual(p.size.height + 0.001);
    }
  }
}

test('默认矩形地图完整纳入有效格与素材外延，四镜头缩放点选和笔刷仍命中同一世界格', async () => {
  const p = await page({}, null);
  expect(p.get('map-id').textContent).toBe('rectangular-water-map');
  expect(p.terrainSprites()).toHaveLength(544);
  expect(p.get('map-summary').textContent).toBe('32 行 × 32 列 · 544 有效格 · 2 实体');
  expect(p.layer.children[0].attrs.scale).toEqual([1, 1]);
  p.get('fit-map').click();
  expect(p.layer.children[0].attrs.scale[0]).toBeGreaterThan(0);
  expect(p.layer.children[0].attrs.scale[0]).toBeLessThan(1);
  const before = p.save();
  for (const angle of [0, 90, 180, 270]) {
    p.camera(angle);
    p.get('fit-map').click();
    expectVisibleSprites(p);
    p.mode('cell');
    p.tool('select');
    p.clickGrid([15, 0]);
    expect(p.get('cell-grid').textContent).toBe('[15,0]');
    p.tool('water');
    p.pointer('pointerdown', [15, 0]);
    p.pointer('pointerup', [15, 0]);
    const edited = p.save();
    expect(edited.cells[0][15].terrain).toBe('water');
    expect(edited.entities).toEqual(before.entities);
    expect(edited.cells.flat().filter(Boolean)).toHaveLength(544);
    p.get('undo').click();
    expect(p.save()).toEqual(before);
  }
  expect(p.errors).toEqual([]);
  p.window.close();
});

test('左键平移与笔刷工具中键平移只更新根变换，节点、规则、占用、JSON 和撤销不变', async () => {
  const p = await page({}, null);
  p.get('fit-map').click();
  const before = p.save();
  const root = p.layer.children[0];
  const nodes = p.descendants(root);
  const position = [...root.attrs.pos];
  const scale = [...root.attrs.scale];
  const counts = [p.resolve, p.terrainResolve, p.importMap, p.occupancy].map(spy => spy.mock.calls.length);
  p.tool('pan');
  p.screenPointer('pointerdown', [200, 160]);
  p.screenPointer('pointermove', [275, 205]);
  p.screenPointer('pointerup', [275, 205]);
  expectNearPoint(root.attrs.pos, position.map((value, axis) => value + [75, 45][axis]));
  expect(root.attrs.scale).toEqual(scale);
  expect(p.layer.children[0]).toBe(root);
  p.descendants(root).forEach((node, index) => expect(node).toBe(nodes[index]));
  [p.resolve, p.terrainResolve, p.importMap, p.occupancy].forEach((spy, index) => expect(spy).toHaveBeenCalledTimes(counts[index]));
  expect(p.captured.size).toBe(0);
  p.tool('water');
  p.screenPointer('pointerdown', [250, 200], 1);
  p.screenPointer('pointermove', [220, 180], 1);
  p.screenPointer('pointerup', [220, 180], 1);
  expectNearPoint(root.attrs.pos, position.map((value, axis) => value + [45, 25][axis]));
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
  expect(p.get('redo').disabled).toBe(true);
  [p.resolve, p.terrainResolve, p.importMap, p.occupancy].forEach((spy, index) => expect(spy).toHaveBeenCalledTimes(counts[index]));
  expect(p.errors).toEqual([]);
  p.window.close();
});

test.each(['Escape', 'pointercancel', 'lostpointercapture', 'blur'])('%s 撤回活动平移并释放捕获，原工作视口和事实不变', async reason => {
  const p = await page({}, null);
  p.get('native-size').click();
  const before = p.save();
  const root = p.layer.children[0];
  const position = [...root.attrs.pos];
  const scale = [...root.attrs.scale];
  p.tool('pan');
  p.screenPointer('pointerdown', [200, 160]);
  p.screenPointer('pointermove', [310, 195]);
  expect(root.attrs.pos).not.toEqual(position);
  if (reason === 'Escape') p.window.document.dispatchEvent(new p.window.KeyboardEvent('keydown', { key: 'Escape' }));
  else if (reason === 'blur') p.window.dispatchEvent(new p.window.Event('blur'));
  else p.screenPointer(reason, [310, 195]);
  expectNearPoint(root.attrs.pos, position);
  expect(root.attrs.scale).toEqual(scale);
  expect(p.layer.children[0]).toBe(root);
  expect(p.captured.size).toBe(0);
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
  expect(p.errors).toEqual([]);
  p.window.close();
});

test('平移后工作中心跨四向、原尺寸及 resize 保持；查看全图重新适配且不放大', async () => {
  const p = await page({}, null);
  p.get('fit-map').click();
  p.tool('pan');
  p.screenPointer('pointerdown', [250, 180]);
  p.screenPointer('pointermove', [370, 220]);
  p.screenPointer('pointerup', [370, 220]);
  const center = p.worldCenter();
  const scale = [...p.layer.children[0].attrs.scale];
  for (const angle of [90, 180, 270, 0]) {
    p.camera(angle);
    expectNearPoint(p.worldCenter(), center);
    expect(p.layer.children[0].attrs.scale).toEqual(scale);
  }
  p.get('native-size').click();
  expect(p.layer.children[0].attrs.scale).toEqual([1, 1]);
  expectNearPoint(p.worldCenter(), center);
  const root = p.layer.children[0];
  const rules = p.terrainResolve.mock.calls.length;
  p.resize(550, 380);
  expect(p.scene().options).toMatchObject({ width: 550, height: 380 });
  expect(p.scene().resize).toHaveBeenCalledWith();
  expect(p.layer.children[0]).toBe(root);
  expectNearPoint(p.worldCenter(), center);
  expect(p.terrainResolve).toHaveBeenCalledTimes(rules);
  p.get('fit-map').click();
  const fitScale = p.layer.children[0].attrs.scale[0];
  expect(fitScale).toBeLessThan(1);
  expectVisibleSprites(p);
  p.resize(1050, 650);
  expect(p.layer.children[0].attrs.scale[0]).toBeGreaterThan(fitScale);
  expectVisibleSprites(p);
  p.resize(4000, 3000);
  expect(p.layer.children[0].attrs.scale).toEqual([1, 1]);
  expectVisibleSprites(p);
  expect(p.errors).toEqual([]);
  p.window.close();
});

test('resize 取消活动平移和笔刷，水面时间继续且保存格式没有视口或动画字段', async () => {
  const p = await page({}, null);
  const before = p.save();
  const deep = p.tiles().find(tile => tile.waterKind === 'deep');
  expect(deep).toBeDefined();
  p.mode('cell');
  p.clickGrid(deep.grid);
  p.get('native-size').click();
  const center = p.worldCenter();
  const root = p.layer.children[0];
  p.tool('pan');
  p.screenPointer('pointerdown', [250, 180]);
  p.screenPointer('pointermove', [340, 230]);
  p.advance(300);
  p.resize(700, 430);
  expect(p.layer.children[0]).toBe(root);
  expectNearPoint(p.worldCenter(), center);
  expect(p.captured.size).toBe(0);
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 3) % 24 + 1} / 24`);
  p.tool('water');
  p.pointer('pointerdown', [15, 0]);
  expect(p.get('save-map').disabled).toBe(true);
  p.advance(200);
  p.resize(680, 420);
  expect(p.get('save-map').disabled).toBe(false);
  expect(p.get('undo').disabled).toBe(true);
  expectNearPoint(p.worldCenter(), center);
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 5) % 24 + 1} / 24`);
  expect(p.save()).toEqual(before);
  expect(Object.keys(p.save()).sort()).toEqual(Object.keys(before).sort());
  expect(p.errors).toEqual([]);
  p.window.close();
});

test('宽水域样本包含派生深处水面，时钟只更新图片而不重复规则、索引、实体解析或写入事实', async () => {
  const p = await page({}, 'deep-water-map');
  expect(p.get('map-id').textContent).toBe('deep-water-map');
  expect(p.terrainSprites()).toHaveLength(45);
  const waterTiles = p.tiles().filter(tile => tile.waterKind);
  expect(waterTiles.filter(tile => tile.waterKind === 'deep').map(tile => tile.grid)).toEqual([[3, 3]]);
  expect(waterTiles.filter(tile => tile.waterKind === 'transition')).toHaveLength(8);
  expect(p.get('animation-state').textContent).toContain('9 格动态水面');
  p.mode('cell');
  p.clickGrid([3, 3]);
  expect(p.get('cell-info').textContent).toContain('水面: 深处');
  const deep = waterTiles.find(tile => tile.waterKind === 'deep');
  expect(p.get('water-frame').textContent).toBe(`${deep.phase + 1} / 24`);
  const before = p.save();
  const root = p.layer.children[0];
  const nodes = p.descendants(root);
  const sprites = p.terrainSprites();
  const rects = sprites.map(sprite => [...sprite.attrs.sourceRect]);
  const resolveCount = p.resolve.mock.calls.length;
  const ruleCount = p.terrainResolve.mock.calls.length;
  const importCount = p.importMap.mock.calls.length;
  p.advance(99);
  expect(p.updateFrame).not.toHaveBeenCalled();
  p.advance(1);
  expect(p.updateFrame).toHaveBeenCalledTimes(9);
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 1) % 24 + 1} / 24`);
  expect(p.layer.children[0]).toBe(root);
  p.descendants(root).forEach((node, index) => expect(node).toBe(nodes[index]));
  p.terrainSprites().forEach((sprite, index) => expect(sprite).toBe(sprites[index]));
  expect(sprites.filter((sprite, index) => JSON.stringify(sprite.attrs.sourceRect) !== JSON.stringify(rects[index]))).toHaveLength(9);
  expect(p.resolve).toHaveBeenCalledTimes(resolveCount);
  expect(p.terrainResolve).toHaveBeenCalledTimes(ruleCount);
  expect(p.importMap).toHaveBeenCalledTimes(importCount);
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
  expect(p.get('redo').disabled).toBe(true);
  expect(before.cells.flat().filter(Boolean).every(cell => Object.keys(cell).sort().join(',') === 'elevation,terrain')).toBe(true);
  expect(p.errors).toEqual([]);
  p.window.dispatchEvent(new p.window.Event('pagehide'));
  expect(p.callbacks.size).toBe(0);
  const updates = p.updateFrame.mock.calls.length;
  p.advance(5000);
  expect(p.updateFrame).toHaveBeenCalledTimes(updates);
  p.window.close();
});

test('水面暂停、四向切换、继续与显式重播保持相位规则，时间不进入地图 JSON', async () => {
  const p = await page({}, 'deep-water-map');
  p.mode('cell');
  p.clickGrid([3, 3]);
  const deep = p.tiles().find(tile => tile.waterKind === 'deep');
  p.advance(230);
  const expected = `${(deep.phase + 2) % 24 + 1} / 24`;
  expect(p.get('water-frame').textContent).toBe(expected);
  p.get('play-animation').click();
  expect(p.get('animation-state').textContent).toContain('已暂停');
  p.advance(5000);
  const facts = p.save();
  for (const angle of [90, 180, 270, 0]) {
    p.camera(angle);
    expect(p.get('water-frame').textContent).toBe(expected);
    expect(p.get('cell-grid').textContent).toBe('[3,3]');
    expect(p.save()).toEqual(facts);
  }
  p.get('play-animation').click();
  p.advance(70);
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 3) % 24 + 1} / 24`);
  p.get('restart-animation').click();
  expect(p.get('water-frame').textContent).toBe(`${deep.phase + 1} / 24`);
  expect(p.get('animation-state').textContent).toContain('播放中');
  expect(p.save()).toEqual(facts);
  expect(p.get('undo').disabled).toBe(true);
  expect(p.errors).toEqual([]);
  p.window.close();
});

test('改地形使深处水面重新派生，预览取消和整笔撤销恢复当前时间的动画', async () => {
  const p = await page({}, 'deep-water-map');
  p.mode('cell');
  p.clickGrid([3, 3]);
  const before = p.save();
  const deep = p.tiles().find(tile => tile.waterKind === 'deep');
  const root = p.layer.children[0];
  p.tool('land');
  p.pointer('pointerdown', [3, 3]);
  expect(p.get('animation-state').textContent).toContain('0 格动态水面');
  expect(p.get('save-map').disabled).toBe(true);
  expect(p.get('undo').disabled).toBe(true);
  p.advance(500);
  p.get('cancel-stroke').click();
  expect(p.layer.children[0]).toBe(root);
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 5) % 24 + 1} / 24`);
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
  p.pointer('pointerdown', [3, 3]);
  p.pointer('pointerup', [3, 3]);
  const after = p.save();
  expect(after.cells[3][3].terrain).toBe('land');
  expect(p.get('water-frame').textContent).toBe('—');
  expect(p.get('undo').disabled).toBe(false);
  p.advance(100);
  p.get('undo').click();
  expect(p.get('animation-state').textContent).toContain('9 格动态水面');
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 6) % 24 + 1} / 24`);
  expect(p.save()).toEqual(before);
  p.get('redo').click();
  expect(p.save()).toEqual(after);
  p.get('undo').click();
  const frame = p.get('water-frame').textContent;
  p.get('map-json').value = JSON.stringify(before);
  p.get('read-map').click();
  expect(p.get('water-frame').textContent).toBe(frame);
  expect(p.save()).toEqual(before);
  expect(p.errors).toEqual([]);
  p.window.close();
});

test('坏 v2 水面素材重新加载失败保留旧动态节点，修复后在同一时钟恢复', async () => {
  const p = await page({}, 'deep-water-map');
  p.mode('cell');
  p.clickGrid([3, 3]);
  const before = p.save();
  const root = p.layer.children[0];
  const sprites = p.terrainSprites();
  const deep = p.tiles().find(tile => tile.waterKind === 'deep');
  p.faults.animation = true;
  await p.reload();
  expect(p.get('issues').textContent).toContain('sequences.water.frames[0].rect');
  expect(p.layer.children[0]).toBe(root);
  p.terrainSprites().forEach((sprite, index) => expect(sprite).toBe(sprites[index]));
  p.advance(200);
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 2) % 24 + 1} / 24`);
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
  delete p.faults.animation;
  await p.reload();
  expect(p.get('issues').hidden).toBe(true);
  expect(p.get('water-frame').textContent).toBe(`${(deep.phase + 2) % 24 + 1} / 24`);
  expect(p.layer.children[0]).not.toBe(root);
  expect(p.terrainSprites().every(sprite => sprite.attrs.texture.batch === 3)).toBe(true);
  expect(p.save()).toEqual(before);
  expect(p.errors).toEqual([]);
  p.window.close();
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
    expect(p.layer.children[0].children.slice(-1)[0].children.filter(node => node.attrs.strokeColor === '#1976b5')).toHaveLength(4);
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

test('加载只解析一次，点选和切换查看方式只更新高亮，不重建实体节点', async () => {
  const p = await page();
  const root = p.layer.children[0];
  const sprites = p.sprites();
  expect(p.resolve).toHaveBeenCalledTimes(1);
  for (const grid of [[1, 1], [3, 1], [0, 0], [-1, 0]]) p.clickGrid(grid);
  p.mode('cell');
  p.clickGrid([1, 1]);
  expect(p.get('cell-info').textContent).toContain('terrain: land');
  expect(p.resolve).toHaveBeenCalledTimes(1);
  expect(p.layer.children[0]).toBe(root);
  p.sprites().forEach((sprite, index) => expect(sprite).toBe(sprites[index]));
  p.camera(90);
  expect(p.resolve).toHaveBeenCalledTimes(2);
  expect(p.layer.children[0]).not.toBe(root);
  expect(p.get('cell-grid').textContent).toBe('[1,1]');
});

test.each([
  ['http', 'HTTP 404'], ['json', 'JSON'], ['map', 'entities[0].element'],
  ['cells', 'cells'],
  ['definition', 'views.90'], ['image', 'images/sculpture_dog01.png'],
  ['rules', '$rules'], ['terrain', 'emperor-terrain-202'],
])('%s 失败保留旧事实、选择和节点，修复后同页重载恢复', async (fault, message) => {
  const p = await page();
  p.clickGrid([1, 1]);
  const oldRoot = p.layer.children[0];
  const oldSprites = p.sprites();
  p.faults[fault] = true;
  await p.reload();
  expect(p.get('issues').hidden).toBe(false);
  expect(p.get('issues').textContent).toContain(message);
  expect(p.get('controls').disabled).toBe(false);
  expect(p.get('map-id').textContent).toBe('first-static-map');
  expect(p.get('entity-id').textContent).toBe('dog-a');
  expect(p.layer.children).toEqual([oldRoot]);
  p.sprites().forEach((sprite, index) => expect(sprite).toBe(oldSprites[index]));
  p.clickGrid([4, 2]);
  expect(p.get('entity-id').textContent).toBe('dog-b');
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
  expect(p.layer.children).toHaveLength(1);
  expect(p.get('controls').disabled).toBe(false);
  delete p.faults.delay;
  delete p.faults.map;
  await p.reload();
  finish();
  await settle();
  expect(p.get('issues').hidden).toBe(true);
  expect(p.sprites()).toHaveLength(2);
  expect(p.sprites().every(node => node.attrs.texture.batch === 3)).toBe(true);
});


test.each(['http', 'json', 'map', 'cells', 'definition', 'image'])('首次 %s 失败保持空状态，修复后恢复', async fault => {
  const p = await page({ [fault]: true });
  expect(p.layer.children).toHaveLength(0);
  expect(p.get('controls').disabled).toBe(true);
  expect(p.get('status').textContent).toContain('当前无地图');
  delete p.faults[fault];
  await p.reload();
  expect(p.get('controls').disabled).toBe(false);
  expect(p.sprites()).toHaveLength(2);
});

test('同格按索引顺序选择，点选和切镜头不重复导入或建立索引', async () => {
  const p = await page({ overlap: true });
  p.clickGrid([2, 2]);
  expect(p.get('entity-id').textContent).toBe('dog-a');
  p.camera(90);
  p.clickGrid([1, 1]);
  expect(p.get('entity-id').textContent).toBe('dog-a');
  expect(p.importMap).toHaveBeenCalledTimes(1);
  expect(p.importMap.mock.results[0].value.index.get('1,1')).toEqual(['dog-a', 'dog-b']);
});

test('清选同时清除格子和实体详情，不重建场景', async () => {
  const p = await page();
  p.clickGrid([2, 2]);
  const root = p.layer.children[0];
  p.get('clear-selection').click();
  expect(p.get('cell-grid').textContent).toBe('—');
  expect(p.get('entity-id').textContent).toBe('—');
  expect(p.layer.children[0]).toBe(root);
  expect(p.resolve).toHaveBeenCalledTimes(1);
});


test('整笔拖动包含中间格，预览不入历史，提交一次撤销并重做；保存回读重建同图', async () => {
  const p = await page();
  const before = p.save();
  p.tool('water');
  p.pointer('pointerdown', [1, 0]);
  p.pointer('pointermove', [4, 0]);
  expect(p.get('status').textContent).toContain('整笔预览');
  expect(p.get('save-map').disabled).toBe(true);
  expect(p.get('undo').disabled).toBe(true);
  p.pointer('pointerup', [4, 0]);
  const after = p.save();
  expect(after.cells[0].slice(1, 5).map(cell => cell.terrain)).toEqual(['water', 'water', 'water', 'water']);
  expect(after.entities).toEqual(before.entities);
  expect(after.cells.flat().filter(Boolean).every(cell => !Object.prototype.hasOwnProperty.call(cell, 'tile'))).toBe(true);
  const rects = p.terrainSprites().map(node => node.attrs.sourceRect);
  p.get('undo').click();
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
  p.get('redo').click();
  expect(p.save()).toEqual(after);
  p.get('read-map').click();
  expect(p.terrainSprites().map(node => node.attrs.sourceRect)).toEqual(rects);
  expect(p.get('issues').hidden).toBe(true);
});

test.each(['Escape', 'pointercancel', 'lostpointercapture', 'blur'])('%s 取消已预览整笔，事实和旧绘制恢复，不留下撤销项', async reason => {
  const p = await page();
  const before = p.save();
  const root = p.layer.children[0];
  p.tool('water');
  p.pointer('pointerdown', [1, 0]);
  if (reason === 'Escape') p.window.document.dispatchEvent(new p.window.KeyboardEvent('keydown', { key: 'Escape' }));
  else if (reason === 'blur') p.window.dispatchEvent(new p.window.Event('blur'));
  else p.pointer(reason, [1, 0]);
  expect(p.layer.children).toEqual([root]);
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
});

test.each([[0, 0], [-1, 1]])('首格无效 %s，不移除已有根节点，松开后保持地图', async (x, y) => {
  const p = await page();
  const before = p.save();
  const root = p.layer.children[0];
  p.tool('water');
  p.pointer('pointerdown', [x, y]);
  expect(p.layer.children).toEqual([root]);
  p.pointer('pointerup', [x, y]);
  expect(p.layer.children).toEqual([root]);
  expect(p.save()).toEqual(before);
  expect(p.get('undo').disabled).toBe(true);
});

test('中途越界拒绝整笔；失败后 Esc、重试和切镜头均保留世界事实', async () => {
  const p = await page();
  const before = p.save();
  const root = p.layer.children[0];
  p.tool('water');
  p.pointer('pointerdown', [1, 0]);
  p.pointer('pointermove', [0, 0]);
  p.window.document.dispatchEvent(new p.window.KeyboardEvent('keydown', { key: 'Escape' }));
  expect(p.layer.children).toEqual([root]);
  expect(p.save()).toEqual(before);
  p.pointer('pointerdown', [1, 0]);
  p.pointer('pointerup', [1, 0]);
  const after = p.save();
  for (const angle of [90, 180, 270, 0]) {
    p.camera(angle);
    expect(p.save()).toEqual(after);
  }
});

test.each(['{broken', JSON.stringify({ ...JSON.parse(read('static/map-samples/first-static-map.json')), tileSize: [40, 20] })])('坏输入保持地图、选择和历史，可改正恢复', async json => {
  const p = await page();
  const before = p.save();
  p.clickGrid([1, 1]);
  const root = p.layer.children[0];
  p.get('map-json').value = json;
  p.get('read-map').click();
  expect(p.get('issues').hidden).toBe(false);
  expect(p.layer.children).toEqual([root]);
  expect(p.get('entity-id').textContent).toBe('dog-a');
  expect(p.get('undo').disabled).toBe(true);
  expect(p.save()).toEqual(before);
  p.get('read-map').click();
  expect(p.get('issues').hidden).toBe(true);
});

test('异步加载未完成时的新编辑使旧加载失效，撤销后新笔清空重做', async () => {
  const p = await page();
  let finish;
  p.faults.delay = new Promise(resolve => { finish = resolve; });
  await p.reload();
  p.tool('water');
  p.pointer('pointerdown', [1, 0]);
  p.pointer('pointerup', [1, 0]);
  const after = p.save();
  finish();
  await settle();
  expect(p.save()).toEqual(after);
  p.get('undo').click();
  expect(p.get('redo').disabled).toBe(false);
  p.pointer('pointerdown', [2, 0]);
  p.pointer('pointerup', [2, 0]);
  expect(p.get('redo').disabled).toBe(true);
});


test('完整地表与实体共同按深度排列，前方地表不固定压在实体下面', async () => {
  const p = await page();
  const content = p.contentLayer().children[0];
  const rendered = content.children.map(holder => holder.children[0].children[0]);
  const dog = rendered.findIndex(node => node.attrs.texture.file !== 'atlas.png');
  expect(dog).toBeGreaterThan(0);
  expect(rendered.slice(dog + 1).some(node => node.attrs.texture.file === 'atlas.png')).toBe(true);
});

test.each([true, false])('地图缓存恢复保留原播放状态（播放=%s）、累计时间和尺寸监听', async playing => {
  const p = await page({}, 'deep-water-map');
  p.mode('cell');
  p.clickGrid([3, 3]);
  p.advance(200);
  if (!playing) p.get('play-animation').click();
  const frame = p.get('water-frame').textContent;
  p.window.dispatchEvent(new p.window.PageTransitionEvent('pagehide', { persisted: true }));
  expect(p.callbacks.size).toBe(0);
  p.advance(5000);
  Object.assign(p.size, { width: 620, height: 380 });
  p.window.dispatchEvent(new p.window.PageTransitionEvent('pageshow', { persisted: true }));
  expect(p.callbacks.size).toBe(playing ? 1 : 0);
  expect(p.get('water-frame').textContent).toBe(frame);
  expect(p.scene().options).toMatchObject({ width: 620, height: 380 });
  p.resize(700, 440);
  expect(p.scene().options).toMatchObject({ width: 700, height: 440 });
  if (!playing) p.get('play-animation').click();
  p.advance(100);
  expect(p.get('water-frame').textContent).not.toBe(frame);
  expect(p.callbacks.size).toBe(1);
  expect(p.errors).toEqual([]);
  p.window.close();
});

test('笔刷复用命令的地表与绘制帧结果，同格移动、回描和松开不重复重建', async () => {
  const p = await page();
  const rules = p.terrainResolve.mock.calls.length;
  expect(p.resolveFrame).not.toHaveBeenCalled();
  p.tool('water');
  p.pointer('pointerdown', [1, 0]);
  const calls = p.resolve.mock.calls.length;
  const root = p.layer.children[0];
  p.pointer('pointermove', [1, 0]);
  expect(p.layer.children[0]).toBe(root);
  expect(p.resolve).toHaveBeenCalledTimes(calls);
  p.pointer('pointermove', [2, 0]);
  const nextRoot = p.layer.children[0];
  p.pointer('pointermove', [1, 0]);
  p.pointer('pointerup', [1, 0]);
  expect(p.layer.children[0]).toBe(nextRoot);
  expect(p.resolve).toHaveBeenCalledTimes(calls + 1);
  expect(p.terrainStroke).toHaveBeenCalledTimes(2);
  expect(p.terrainResolve).toHaveBeenCalledTimes(rules);
  expect(p.resolveFrame).not.toHaveBeenCalled();
  const map = p.save();
  expect(map.cells[0][1].terrain).toBe('water');
  expect(map.cells[0][2].terrain).toBe('water');
  expect(p.get('undo').disabled).toBe(false);
  expect(p.errors).toEqual([]);
  p.window.close();
});
